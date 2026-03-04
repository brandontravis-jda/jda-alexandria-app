# JDA Catalyst — New Project Setup Guide

Step-by-step instructions for configuring a new client site after scaffolding from the template.

---

## Table of Contents

0. [Developer Prerequisites](#0-developer-prerequisites)
1. [Scaffold the Project](#1-scaffold-the-project)
2. [Sanity CMS](#2-sanity-cms)
3. [Design Tokens (Branding)](#3-design-tokens-branding)
4. [Cloudflare Turnstile (Bot Protection)](#4-cloudflare-turnstile-bot-protection)
5. [Resend (Email)](#5-resend-email)
6. [GitHub Repository](#6-github-repository)
7. [Vercel Deployment](#7-vercel-deployment)
8. [Sanity Webhook for ISR](#8-sanity-webhook-for-isr)
9. [Sanity Content Setup](#9-sanity-content-setup)
10. [Staging Environment](#10-staging-environment)
11. [Launch Checklist](#11-launch-checklist)
12. [Client Offboarding](#12-client-offboarding)

---

## 0. Developer Prerequisites

### Requirements

- Node.js 20+
- npm 10+
- A Sanity account ([sanity.io](https://sanity.io))
- SSH access to the JDA-Worldwide GitHub org

### SSH setup for the JDA-Worldwide GitHub org

JDA repos live under the `JDA-Worldwide` GitHub organization. If you use a personal GitHub account for other work, you'll need a separate SSH key so git knows which credentials to use for JDA repos.

**1. Generate an SSH key:**

```bash
ssh-keygen -t ed25519 -C "jda-worldwide" -f ~/.ssh/id_ed25519_jda -N ""
```

**2. Add the public key to GitHub:**

```bash
cat ~/.ssh/id_ed25519_jda.pub
```

Copy the output, then:

1. Log in to the GitHub account that has access to the JDA-Worldwide org
2. Go to [github.com/settings/keys](https://github.com/settings/keys)
3. Click **New SSH key** → Key type: **Authentication key**
4. Paste the public key and save

**3. Create (or add to) your SSH config:**

Open `~/.ssh/config` and add:

```
# JDA-Worldwide GitHub account
Host github-jda
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_jda
  IdentitiesOnly yes
```

If you also have a personal GitHub account, add another block:

```
# Personal GitHub account
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes
```

**4. Use the alias when cloning or setting remotes:**

```bash
# Clone using the JDA alias
git clone git@github-jda:JDA-Worldwide/jda-catalyst.git

# Or update an existing repo's remote
git remote set-url origin git@github-jda:JDA-Worldwide/some-client-repo.git
```

The `github-jda` host alias ensures git uses the JDA SSH key for any repo under the JDA-Worldwide org, regardless of what other GitHub accounts you have configured.

---

## 1. Scaffold the Project

```bash
npm create jda-catalyst my-client-site
```

The CLI will prompt for:
- **Project name** — used in `package.json` and Sanity Studio title
- **Sanity project ID** — from step 2 below (you can come back and update this)
- **Primary brand color** — injected into design tokens
- **Site URL** — production domain

After scaffolding:

```bash
cd my-client-site
cp .env.local.example .env.local
```

Fill in `.env.local` as you work through the steps below. Once Sanity is configured (step 2), you can run `npm run seed` to populate demo content and see the site in action immediately.

---

## 2. Sanity CMS

### Create a Sanity project

1. Go to [sanity.io/manage](https://www.sanity.io/manage) and create a new project
2. Name it after the client (e.g., "Acme Corp Website")
3. Note the **Project ID** from the project dashboard

Or initialize from the command line:

```bash
npx sanity@latest init --env .env.local
```

This creates the project, selects a dataset, and writes credentials to `.env.local`.

### Generate an API token

1. In [sanity.io/manage](https://www.sanity.io/manage), open the project
2. Go to **Settings → API → Tokens**
3. Click **Add API token**
4. Name: `Next.js Editor` (or similar)
5. Permissions: **Editor** — the token needs write access to create `formSubmission` documents from the contact form, and it is also used by the Presentation tool for live visual editing in draft mode
6. Copy the token

### Update `.env.local`

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=your-editor-token
```

### Update Sanity Studio config (if needed)

If you used the CLI (`npm create jda-catalyst`), the Studio name and title are already set from your answers. If you need to change them later, open `src/sanity/sanity.config.ts`:

```typescript
export default defineConfig({
  name: "acme-corp",
  title: "Acme Corp",
  // projectId and dataset come from env vars — no changes needed
});
```

### Add CORS origin

1. In [sanity.io/manage](https://www.sanity.io/manage) → **Settings → API → CORS origins**
2. Add `http://localhost:3000` (for development)
3. Add the production URL (e.g., `https://acme-corp.com`) after deployment
4. Check **Allow credentials** for both

### Verify it works

```bash
npm run dev
```

Visit `http://localhost:3000/studio` — you should see Sanity Studio load with the Dashboard tab showing content counts and project info.

- **Dashboard** — landing tab with an overview of your content
- **Structure** — primary content editing interface (pages, blog posts, settings)
- **Presentation** — live visual editing with click-to-edit overlays (works automatically once the API token is set)
- **Vision** — GROQ query playground for testing queries

---

## 3. Design Tokens (Branding)

All brand-specific values live in a single file: `src/app/globals.css`.

```css
@theme inline {
  /* Colors — replace with client brand palette */
  --color-brand-primary: #1A1018;
  --color-brand-secondary: #ED1A3B;
  --color-brand-muted: #8A7A72;
  --color-brand-background: #FFFFFF;
  --color-brand-surface: #F9F8F7;
  --color-brand-border: #D6CFC8;
  --color-brand-text: #4A3F44;
  --color-brand-text-heading: #1A1018;

  /* Fonts — swap for client typeface */
  --font-display: Georgia, serif;
  --font-body: Arial, sans-serif;

  /* Spacing — adjust section rhythm */
  --spacing-section: 5rem;
  --spacing-section-sm: 3rem;

  /* Layout */
  --container-content: 75rem;

  /* Border radius — 0 for sharp, 0.75rem for rounded */
  --radius-DEFAULT: 0.375rem;
}
```

### What each token controls

| Token | Used for |
|-------|----------|
| `brand-primary` | Headings, navigation background, dark UI elements |
| `brand-secondary` | Buttons, links, CTAs, accent highlights |
| `brand-muted` | Captions, secondary text, metadata |
| `brand-background` | Page background |
| `brand-surface` | Card backgrounds, alternating section backgrounds |
| `brand-border` | Dividers, input borders, card outlines |
| `brand-text` | Body copy |
| `brand-text-heading` | Headings (often matches `brand-primary`) |
| `font-display` | Headings, hero text |
| `font-body` | Body copy, UI elements |
| `spacing-section` | Vertical padding between page builder modules |
| `container-content` | Max width of content area (default 1200px) |
| `radius-DEFAULT` | Border radius on buttons, cards, inputs |

### Custom fonts

If the client uses web fonts (Google Fonts, Adobe Fonts, or self-hosted):

1. For Google Fonts or self-hosted: use `next/font` in `src/app/layout.tsx` to load the font with `variable` output
2. Update the `--font-display` and `--font-body` tokens to reference the CSS variable
3. For Adobe Fonts: add the embed `<link>` in the root layout `<head>` and reference the font family name directly

---

## 4. Cloudflare Turnstile (Bot Protection)

JDA uses a **shared Cloudflare account** with Turnstile widgets managed centrally. The free tier supports 20 widgets with 10 hostnames each.

### For new client sites

1. Log in to the **JDA Cloudflare account** at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Go to **Turnstile** in the sidebar
3. Either **add the client's hostname to an existing widget** (if one has capacity) or **create a new widget**:
   - Name: descriptive (e.g., "JDA Client Sites — Batch 2")
   - Hostnames: add the client's production domain and `localhost`
   - Widget mode: **Managed** (recommended) or Invisible
4. Copy the **Site Key** and **Secret Key** from the widget

### Update `.env.local`

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
```

### For local development

Cloudflare provides test keys that always pass or always fail. Use these during development if you don't want to add `localhost` to the widget:

| Key type | Site Key | Secret Key |
|----------|----------|------------|
| Always passes | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always fails | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AB` |
| Forces interactive | `3x00000000000000000000FF` | `3x0000000000000000000000000000000FF` |

### Important notes

- Turnstile widgets are **shared across client sites** under the JDA Cloudflare account
- Each widget supports up to **10 hostnames** — group client domains onto widgets efficiently
- When a client is offboarded (see [Client Offboarding](#12-client-offboarding)), their hostname must be removed and they'll need to set up their own Turnstile widget

---

## 5. Resend (Email)

Resend handles contact form notification emails. Each client site needs a verified sending domain.

### Set up a sending domain

1. Log in to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter the client's domain (e.g., `acme-corp.com`)
4. Resend will provide DNS records to add:

| Record Type | Purpose |
|-------------|---------|
| TXT (DKIM) | Email authentication — proves emails are from this domain |
| TXT (SPF) | Authorizes Resend to send on behalf of the domain |
| TXT (DMARC) | Policy for handling failed authentication |
| MX (optional) | Only if using Resend for receiving email |

5. Add these DNS records at the client's domain registrar (GoDaddy, Cloudflare, Namecheap, etc.)
6. Return to Resend and click **Verify** — propagation can take a few minutes to 48 hours

### Generate an API key

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Create a key scoped to the verified domain (recommended) or a full-access key
3. Copy the key

### Update `.env.local`

```env
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_FORM_SENDER=noreply@acme-corp.com
CONTACT_FORM_RECIPIENT=info@acme-corp.com
```

- `CONTACT_FORM_SENDER` — the `from` address for notification emails. Must match the verified Resend domain.
- `CONTACT_FORM_RECIPIENT` — the default `to` address. Can be overridden per-form via the `recipientEmail` field in the Sanity ContactForm module config.

---

## 6. GitHub Repository

1. Create a new **private** repo in the JDA-Worldwide GitHub org
2. Name it after the client (e.g., `acme-corp-website`)
3. Push the scaffolded project using the `github-jda` SSH alias (see [Developer Prerequisites](#0-developer-prerequisites)):

```bash
git init
git add .
git commit -m "Initial scaffold from jda-catalyst template"
git remote add origin git@github-jda:JDA-Worldwide/acme-corp-website.git
git branch -M main
git push -u origin main
```

---

## 7. Vercel Deployment

### Import the project

1. Log in to [vercel.com](https://vercel.com) under the JDA team
2. Click **Add New → Project**
3. Import the GitHub repo — Vercel auto-detects Next.js
4. Set the **Framework Preset** to Next.js (should be auto-selected)
5. Click **Deploy**

### Add environment variables

In Vercel → Project → **Settings → Environment Variables**, add all variables from `.env.local`. Set values per environment:

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Project ID | Same | Same |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | `staging` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2024-01-01` | Same | Same |
| `SANITY_API_TOKEN` | Editor token | Same | Same |
| `RESEND_API_KEY` | Live key | Test key (or omit) | Test key (or omit) |
| `CONTACT_FORM_SENDER` | `noreply@acme-corp.com` | Same | Same |
| `CONTACT_FORM_RECIPIENT` | `info@acme-corp.com` | Same | Same |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key | Test key | Test key |
| `TURNSTILE_SECRET_KEY` | Secret key | Test secret | Test secret |
| `SANITY_REVALIDATE_SECRET` | Strong random string | Same | Same |
| `NEXT_PUBLIC_SITE_URL` | `https://acme-corp.com` | `https://preview.acme-corp.com` | `http://localhost:3000` |

Generate `SANITY_REVALIDATE_SECRET` with:

```bash
openssl rand -base64 32
```

### Custom domain

1. In Vercel → Project → **Settings → Domains**
2. Add the client's domain
3. Follow the DNS instructions (usually an A record or CNAME)
4. Vercel provisions SSL automatically

---

## 8. Sanity Webhook for ISR

This webhook tells the site to regenerate pages when content changes in Sanity.

### Create the webhook

1. Go to [sanity.io/manage](https://www.sanity.io/manage) → open the project
2. **Settings → API → Webhooks**
3. Click **Create Webhook**
4. Configure:
   - **Name:** `Vercel ISR Revalidation`
   - **URL:** `https://acme-corp.com/api/revalidate`
   - **Trigger on:** Create, Update, Delete
   - **Filter:** leave blank to revalidate on any document change
   - **Secret:** paste the same `SANITY_REVALIDATE_SECRET` value from Vercel
   - **HTTP method:** POST
   - **HTTP Headers:** add `x-sanity-secret` with the secret value
5. Save

### Verify it works

1. Make a change to any document in Sanity Studio
2. Publish the change
3. Check Vercel → Project → **Logs** to see the `/api/revalidate` request come in
4. Verify the change appears on the live site within a few seconds

---

## 9. Sanity Content Setup

### Quick start with demo content

To see the site working immediately with sample pages, navigation, a blog post, and placeholder images:

```bash
npm run seed
```

This creates demo content in your Sanity dataset so you can explore the site and Studio before adding real client content. Run with `--force` to overwrite existing seed data. Once you're ready, replace the demo content in Studio with the client's actual content.

### Manual setup

If you prefer to build content from scratch, populate the essential content in Sanity Studio. This is the minimum needed for the site to function:

### 9.1 Global Settings (required)

Open Studio → **Global Settings** (singleton document):

- **Site Title** — appears in browser tabs and SEO defaults
- **Site Logo** — used in navigation and JSON-LD
- **Default SEO** — fallback meta title, description, and OG image for pages without custom SEO
- **Social Links** — company social media URLs (used in footer and Organization JSON-LD)

### 9.2 Navigation (required)

Open Studio → **Navigation**:

- Add top-level links (Home, About, Services, Blog, Contact)
- Add dropdown children where needed
- Links can be internal (slug reference) or external (full URL)

### 9.3 Footer (required)

Open Studio → **Footer**:

- Add link columns (e.g., "Company", "Services", "Legal")
- Add social media icons
- Set copyright text (supports `{year}` placeholder for dynamic year)

### 9.4 Homepage (required)

Open Studio → **Pages** → create a page:

- **Title:** Home
- **Slug:** `home` (or configure as the homepage singleton)
- Add page builder modules: at minimum a Hero and one content section
- Fill in SEO fields

### 9.5 Additional pages

Create pages for standard sections: About, Services, Contact, etc. Each page uses the page builder — add modules as needed.

---

## 10. Staging Environment

### Create a staging dataset

```bash
npx sanity dataset copy production staging
```

This copies all production content into a `staging` dataset for safe testing.

### Wire Preview deployments to staging

In Vercel, the `NEXT_PUBLIC_SANITY_DATASET` variable for the **Preview** environment should be set to `staging`. This means every pull request deployment reads from the staging dataset, not production.

### Keep staging in sync

Periodically re-copy production to staging to keep test data fresh:

```bash
npx sanity dataset copy production staging --replace
```

---

## 11. Launch Checklist

Run through this before going live:

### Content
- [ ] Global Settings populated (site title, logo, SEO defaults, social links)
- [ ] Navigation configured with all top-level and dropdown links
- [ ] Footer configured with link columns, social icons, copyright
- [ ] Homepage built with page builder modules
- [ ] All planned pages created and populated
- [ ] Blog posts published (if applicable)

### Configuration
- [ ] Sanity project created with API token
- [ ] Sanity CORS origins added (production URL + localhost)
- [ ] Resend domain verified (DKIM, SPF, DMARC records added)
- [ ] `CONTACT_FORM_SENDER` and `CONTACT_FORM_RECIPIENT` env vars set for this client
- [ ] Turnstile — client hostname added to a shared widget
- [ ] Sanity webhook created and tested
- [ ] Vercel env vars set for Production and Preview
- [ ] Custom domain configured in Vercel with SSL
- [ ] `NEXT_PUBLIC_SITE_URL` updated to production URL

### Quality
- [ ] All pages render correctly with real content
- [ ] Contact form submits successfully (check email delivery + Sanity submission)
- [ ] Mobile navigation works (hamburger, dropdowns, keyboard)
- [ ] Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95
- [ ] Open Graph previews look correct (test at [opengraph.xyz](https://opengraph.xyz))
- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Robots.txt accessible at `/robots.txt`
- [ ] Studio not indexed (verify `noindex` on `/studio`)
- [ ] Staging dataset created and Preview deployments wired to it

---

## 12. Client Offboarding

If a client leaves and needs to take ownership of their site, these services need to be transitioned:

### Sanity
- Transfer project ownership in [sanity.io/manage](https://www.sanity.io/manage) → Project → **Members**
- Client creates their own Sanity account and accepts the transfer
- Update API tokens under the client's account

### Vercel
- Transfer the Vercel project to the client's team, or they re-deploy from their own account
- Update environment variables with their own service credentials

### Resend
- Client sets up their own Resend account
- Verifies their sending domain under their account
- Update the `RESEND_API_KEY` env var

### Cloudflare Turnstile
- **Remove the client's hostname** from the shared JDA Turnstile widget
- Client creates their own Cloudflare account and Turnstile widget
- Client adds their hostname and gets new site key / secret key
- Update `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` env vars

### GitHub
- Transfer the repo to the client's GitHub org, or give them a fork
- Update Vercel's Git integration to point at the new repo

### DNS
- Client manages their own DNS (they likely already do)
- Update A/CNAME records if hosting changes
