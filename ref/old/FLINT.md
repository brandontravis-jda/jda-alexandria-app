# Flint — Project Documentation

## What Is Flint

Flint is a multi-user, agency-grade capture and task management tool. The core concept is a fast-capture Trello-style board for ideas, tasks, and daily debriefs — designed to be used alongside Claude via a Model Context Protocol (MCP) integration. Items are organized into workstreams (columns), have rich detail (notes, links, origin), and flow through a four-stage status lifecycle.

---

## Repository Structure

```
brain-dump/
├── app/                          # Next.js 16 web application
│   ├── src/
│   │   ├── app/                  # App Router pages and API routes
│   │   │   ├── api/
│   │   │   │   ├── items/        # GET (list), POST (create)
│   │   │   │   │   └── [id]/     # PATCH (update), DELETE
│   │   │   │   ├── workstreams/  # GET, POST
│   │   │   │   │   └── [id]/     # PATCH, DELETE
│   │   │   │   ├── debriefs/     # GET, POST
│   │   │   │   │   └── [id]/     # PATCH, DELETE
│   │   │   │   ├── keys/         # GET (list), POST (generate)
│   │   │   │   │   ├── [id]/     # DELETE (revoke)
│   │   │   │   │   └── validate/ # Public — used by MCP server
│   │   │   │   └── me/           # GET session user info
│   │   │   └── sign-in/          # Custom sign-in page
│   │   ├── components/
│   │   │   ├── Flint.tsx         # Main board — columns, drag-drop, header, search
│   │   │   ├── CardDrawer.tsx    # Card detail modal (notes, links, origin, status)
│   │   │   ├── DebriefMode.tsx   # End-of-day debrief modal
│   │   │   ├── DebriefLog.tsx    # Debrief history with inline editing + download
│   │   │   ├── SettingsPanel.tsx # Workstream management + API key management
│   │   │   └── icons.tsx         # Centralized SVG icon components (Font Awesome Pro)
│   │   └── lib/
│   │       ├── db.ts             # PostgreSQL client + TypeScript types
│   │       ├── schema.ts         # Table definitions + idempotent migrations
│   │       ├── auth.ts           # Auth.js v5 + Microsoft Entra ID config
│   │       ├── session.ts        # Session helper (getSession)
│   │       └── utils.ts          # formatDate, getGreeting, generateId
│   ├── public/
│   │   └── manifest.json         # PWA manifest
│   ├── next.config.ts
│   ├── tailwind.config (via postcss)
│   └── railway.json              # Railway deployment config for Next.js service
└── mcp/                          # Standalone MCP server (Node.js)
    ├── src/
    │   └── index.ts              # HTTP server + 7 MCP tools
    ├── package.json
    ├── tsconfig.json
    └── railway.json              # Railway deployment config for MCP service
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components, API routes, middleware |
| Language | TypeScript | Strict mode throughout |
| Styling | Tailwind CSS v4 | Custom CSS variables for theming |
| Icons | Font Awesome Pro v7.2 | Inline SVG components via `icons.tsx` |
| Auth | Auth.js v5 + Microsoft Entra ID | Azure AD SSO, single-tenant |
| Database client | `postgres` npm package | Direct SQL, no ORM |
| Database | PostgreSQL | Hosted on Railway |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Column reorder + cross-column item moves |
| Markdown | `react-markdown` + `remark-gfm` | Notes rendering in card drawer and debrief log |
| MCP SDK | `@modelcontextprotocol/sdk` v1.10.1 | Streamable HTTP transport |
| Validation | `zod` | MCP tool input schemas |
| Hosting | Railway | Two services (Next.js + MCP) + one PostgreSQL instance |
| PWA | Web App Manifest | Standalone mode, Add to Home Screen |

---

## Infrastructure

### Railway Services

Flint runs as **two separate Railway services** connected to one shared PostgreSQL database:

| Service | Root Directory | Start Command | Port |
|---|---|---|---|
| Next.js web app | `app/` | `npm start` | 3000 (Railway default) |
| MCP server | `mcp/` | `node dist/index.js` | 8080 |

Both services are deployed from the same GitHub repository. Railway auto-deploys on push to `main`.

### Database

- **Provider**: Railway managed PostgreSQL
- **Connection**: `DATABASE_URL` environment variable (same value used by both services)
- **SSL**: Required for Railway (`ssl: "require"`), disabled for localhost connections
- **Schema management**: Fully idempotent — `initDb()` runs on every `GET /api/workstreams` call, so migrations apply automatically on first page load after any deployment with no manual intervention required

### Environment Variables

**Next.js service (`app/`):**
```env
DATABASE_URL=postgresql://...        # Railway PostgreSQL connection string
AZURE_AD_CLIENT_ID=...               # From Azure App Registration
AZURE_AD_CLIENT_SECRET=...           # From Azure App Registration
AZURE_AD_TENANT_ID=...               # Your Azure tenant ID
AUTH_SECRET=...                      # Random secret: openssl rand -base64 32
NEXTAUTH_URL=https://your-app.up.railway.app
```

**MCP service (`mcp/`):**
```env
DATABASE_URL=postgresql://...        # Same value as Next.js service
PORT=8080                            # Railway sets this automatically
```

---

## Authentication

Authentication uses **Auth.js v5** with the **Microsoft Entra ID** (Azure AD) provider.

- Sign-in is SSO only — no passwords, no email/password flows
- The stable user identifier is the Azure AD **Object ID** (`oid` claim from the JWT), not the email address. This is important: if a user's email changes, their data is unaffected.
- On first sign-in, `seedWorkstreamsForUser()` creates three default workstreams (Client Work, Internal Projects, Loose Thread)
- The middleware at `src/proxy.ts` enforces authentication on all routes except:
  - `/sign-in`
  - `/api/auth/*` (Auth.js callbacks)
  - `/api/keys/validate` (public — used by MCP server for key validation)

### Setting Up Azure App Registration

1. Go to Azure Portal → Entra ID → App registrations → New registration
2. Name: `Flint` (or anything)
3. Supported account types: **Single tenant** (your org only)
4. Redirect URI: `https://your-app.up.railway.app/api/auth/callback/microsoft-entra-id`
5. After creation, copy **Application (client) ID** → `AZURE_AD_CLIENT_ID`
6. Copy **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
7. Certificates & secrets → New client secret → copy value → `AZURE_AD_CLIENT_SECRET`

---

## Database Schema

All tables use `IF NOT EXISTS` and all column additions use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, making every migration safe to run repeatedly.

### `workstreams`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Slug-style ID set at creation (e.g. `client`, `r-and-d`) |
| user_id | TEXT | Azure AD Object ID |
| label | TEXT | Display name |
| color | TEXT | Hex color string |
| sort_order | INTEGER | Column position on the board |
| hidden | BOOLEAN | Secret workstream — hidden from board by default |
| created_at | BIGINT | Unix millisecond timestamp |

### `items`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Random alphanumeric |
| user_id | TEXT | Azure AD Object ID |
| text | TEXT | Card title / content |
| tag | TEXT | Workstream ID (foreign key by convention, no FK constraint) |
| status | TEXT | `not_started` (default), `active`, `parked`, `done` |
| pinned | BOOLEAN | Float to top of column |
| notes | TEXT | Markdown content, default `''` |
| links | JSONB | Array of `{ url, label }` objects, default `[]` |
| origin | TEXT | Where the idea came from, default `''` |
| created_at | BIGINT | Unix millisecond timestamp |
| updated_at | BIGINT | Unix millisecond timestamp |

### `debriefs`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Random alphanumeric |
| user_id | TEXT | Azure AD Object ID |
| did | TEXT | What got done today |
| stuck | TEXT | What was blocked |
| ideas | TEXT | Ideas that came up |
| tomorrow | TEXT | Priority for tomorrow |
| created_at | BIGINT | Unix millisecond timestamp |

### `api_keys`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Random alphanumeric |
| user_id | TEXT | Azure AD Object ID |
| name | TEXT | Key label, default `'Default'` |
| key_hash | TEXT | SHA-256 hash of the raw key — raw key is never stored |
| key_prefix | TEXT | First 12 characters of the raw key, for display only |
| created_at | BIGINT | Unix millisecond timestamp |
| last_used_at | BIGINT | Updated on every authenticated MCP request |

---

## API Routes

All routes require authentication (Auth.js session cookie) except where noted.

| Method | Path | Description |
|---|---|---|
| GET | `/api/items` | List all items for the current user. Normalizes `links` (JSONB → array) and `pinned` (boolean). |
| POST | `/api/items` | Create an item. Body: `{ text, tag, status?, notes?, links?, origin? }` |
| PATCH | `/api/items/[id]` | Update any fields. Uses COALESCE — omitted fields are left unchanged. |
| DELETE | `/api/items/[id]` | Delete an item. |
| GET | `/api/workstreams` | List workstreams. Also runs `initDb()` to apply any pending migrations. |
| POST | `/api/workstreams` | Create a workstream. |
| PATCH | `/api/workstreams/[id]` | Update label, color, sort_order, or hidden. |
| DELETE | `/api/workstreams/[id]` | Delete a workstream. |
| GET | `/api/debriefs` | List all debriefs, newest first. |
| POST | `/api/debriefs` | Create a debrief. Body: `{ did?, stuck?, ideas?, tomorrow? }` |
| PATCH | `/api/debriefs/[id]` | Update debrief fields. |
| DELETE | `/api/debriefs/[id]` | Delete a debrief. |
| GET | `/api/keys` | List API keys (prefix + metadata, never the raw key). |
| POST | `/api/keys` | Generate a new API key. Returns the raw key **once** — never retrievable again. |
| DELETE | `/api/keys/[id]` | Revoke an API key. |
| GET | `/api/keys/validate?key=...` | **Public.** Validates an API key and returns the associated `user_id`. Used by MCP server. |
| GET | `/api/me` | Returns current user's name and email from the session. |

---

## MCP Server

The MCP server is a standalone Node.js HTTP server in `mcp/`, deployed as a separate Railway service. It connects directly to the PostgreSQL database (bypassing the Next.js app entirely) and authenticates requests using user-generated API keys.

### How It Works

1. User opens Flint Settings → generates an API key
2. The raw key is displayed **once** — copy it immediately
3. Paste the key into Claude.ai's integration URL (see below)
4. On each MCP request, the server SHA-256 hashes the incoming key and looks it up in `api_keys`
5. All tool calls are scoped to the matching `user_id` — complete data isolation between users

### Key Format

```
flint_<32 random base64url characters>
```
Example: `flint_3WML1y5GFEWBW5vyiKIK8B3ySfvJb7Wh`

The prefix `flint_XXXXXX` (first 12 chars) is stored in `key_prefix` for identification in the settings UI. The full key is hashed with SHA-256 and only the hash is stored.

### Authentication Methods

**Authorization header** (standard MCP clients):
```
Authorization: Bearer flint_<your-key>
```

**URL query parameter** (required for Claude.ai's connector UI, which doesn't support auth headers):
```
https://your-mcp-server.up.railway.app/mcp?key=flint_<your-key>
```

### Endpoints

| Path | Method | Description |
|---|---|---|
| `/health` | GET | Health check — returns `{"status":"ok"}` |
| `/mcp` | POST | MCP Streamable HTTP transport endpoint |

### MCP Tools

| Tool | Parameters | Description |
|---|---|---|
| `flint_add` | `text`, `tag`, `status?`, `notes?`, `links?`, `origin?` | Add a new item. Default status: `not_started`. |
| `flint_list` | `tag?`, `status?`, `search?`, `limit?` | List items. Search matches text AND notes. Returns notes preview, links, origin. |
| `flint_update` | `id`, `text?`, `tag?`, `status?`, `notes?`, `links?`, `origin?` | Update any fields on an item. |
| `flint_delete` | `id` | Delete an item by ID. |
| `flint_debrief_save` | `did?`, `stuck?`, `ideas?`, `tomorrow?` | Save an end-of-day debrief. |
| `flint_debrief_list` | `limit?`, `after?` | List recent debriefs. `after` is an ISO date string. |
| `flint_summary` | _(none)_ | Full board summary: counts by workstream (not_started/active/parked/done), active items, stale parked items (>7 days), last debrief. |

### Connecting to Claude.ai

1. Open Claude.ai → Settings → Integrations → Add Integration
2. **Name**: Flint
3. **URL**: `https://your-mcp-server.up.railway.app/mcp?key=flint_<your-api-key>`
4. Save — no additional auth fields needed

### Deploying the MCP Server on Railway

1. In Railway, create a new service from your GitHub repo
2. Set **Root Directory** to `mcp`
3. Set **Start Command** to `npm start` (which runs `node dist/index.js`)
4. Add environment variable: `DATABASE_URL` (same value as the Next.js service)
5. Railway will assign `PORT` automatically — the server reads `process.env.PORT ?? 3001`
6. Generate a Railway domain for the service — this is your MCP URL base

---

## Feature Reference

### Board
- Trello-style columns, one per workstream
- Drag to reorder items within a column
- Drag to move items between columns
- Drag to reorder columns
- Column headers are color-coded; color is set per workstream

### Items / Cards
- **Create**: inline column input or global quick-capture bar (type → select workstream → Enter)
- **Status lifecycle**: `not_started → active → parked → done` (click the status pill on hover)
- **Status colors**: not_started = no border, active = green, parked = amber, done = violet
- **Card detail**: double-click or click edit icon to open the detail modal
  - Edit title (inline, auto-saves)
  - Add/edit markdown notes (click to edit, auto-saves)
  - Add/remove links with favicon display
  - Set origin tag ("where did this idea come from?")
  - Reassign workstream
  - Cycle status
  - Pin to top of column
  - Delete with confirmation
- **Indicators**: link and notes icons appear on the card when populated
- **Pin**: gold border, floats to top of column

### Workstreams
- Create with label + color (label is immutable after creation, color is editable)
- 20-color preset palette
- Drag to reorder
- Mark as **hidden** — excluded from board by default, revealed with the privacy toggle
- Hidden state always resets to hidden on page reload (no session memory)

### Search (⌘K)
- Inline filter bar — no modal, board stays visible
- Matches: card title, notes, link URLs and labels, origin
- Hides columns with no matching cards while active
- Filter bar shows match count

### Debrief (⌘D)
- Modal overlay with blurred backdrop
- Four prompts: Done today / Stuck or blocking / Loose threads / One thing for tomorrow
- Enter advances to next question; Shift+Enter inserts a newline; Escape closes
- Review screen before saving; Enter on review saves
- Saved debriefs appear in a collapsible log at the bottom of the board
  - Click any field to edit inline (markdown supported, auto-saves)
  - Download individual debriefs as `.md` files
  - Delete with confirmation

### Settings Panel
- Add, reorder, recolor, hide/show, and delete workstreams
- Generate, view, and revoke MCP API keys

### Auto-refresh
- Board data refreshes when the window gains focus or the tab becomes visible
- Refresh is skipped while the settings panel is open (prevents clobbering in-flight mutations)

### PWA
- `manifest.json` with `display: standalone` and Flint accent theme color
- iOS and Android Add to Home Screen supported
- Icons at `public/icon-192.png` and `public/icon-512.png` needed for full support

---

## Migration Strategy

`initDb()` in `src/lib/schema.ts` contains all table definitions and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations. It is called on every `GET /api/workstreams` request (the first API call on every page load), making it fully idempotent and self-healing:

- New deployments get all tables created automatically on first load
- Existing deployments get new columns added without any manual migration step
- No migration runner, no version tracking — pure SQL idempotency

---

## Local Development

```bash
cd app
cp ../.env.local.example .env.local
# Fill in DATABASE_URL and Azure AD credentials
npm install
npm run dev
# → http://localhost:3000
```

For the MCP server locally:
```bash
cd mcp
cp .env.example .env
# Fill in DATABASE_URL
npm install
npm run dev
# → http://localhost:3001
```
