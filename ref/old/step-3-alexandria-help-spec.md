# Step 3: Alexandria Help + Platform Discovery Surface
## Implementation Spec — Developed March 30, 2026

---

## What This Step Solves

Without this, Alexandria is a black box. Practitioners who go through onboarding training won't remember everything it can do, and as capabilities grow, there's no mechanism for them to discover what's new without another training. There are two specific failure modes this step must address:

**Bypass failure.** A practitioner says "I need an HTML template for X" without calling Alexandria at all. Claude helps them, but the output is unsanctioned — no brand package pulled, no methodology followed, no quality framework applied.

**False sanction failure.** A practitioner says "using Alexandria, build me a widget." Alexandria doesn't have a widget methodology, so Claude invents one. The practitioner believes the output came through an approved production channel. It didn't.

`alexandria_help` solves both. It is simultaneously a discovery surface (what exists) and a coaching tool (how to use it correctly). Neither function is subordinate to the other.

---

## MCP Tool: `alexandria_help`

### Trigger patterns

The tool fires in two ways:

**Intentional.** The practitioner explicitly asks what Alexandria can do. Trigger phrases include: "what can Alexandria do," "what's available in Alexandria," "what templates do you have," "what methodologies exist," and reasonable variations.

**Proactive.** Claude detects a production request that doesn't match a known Alexandria entry point. The practitioner didn't ask for help — they asked for a deliverable. Before proceeding, Claude calls `alexandria_help` to check whether Alexandria can fulfill the request, then responds accordingly. This is not a full help response — it's a lightweight capability check that tells Claude whether to proceed through Alexandria or surface the unsupported-request flow.

Do not fire `alexandria_help` on every session start. Do not burn a tool call unless a production intent or an explicit help request is present.

### Response structure

The tool returns a structured payload. Claude renders it as a combination of Style A (structured summary with clear sections) and Style D (intent-driven follow-up prompts). The structured summary comes first. The intent buttons follow as a natural next step, not a replacement.

**Response sections, in order:**

1. What Alexandria is — one or two sentences. Not a paragraph.

2. How to start a production job — the canonical entry prompt, presented as a first-class instruction, not a footnote. The required pattern is: *"I need to build a [deliverable type] from Alexandria."* No client name, no content, no layout in that first prompt. Alexandria will ask what it needs.

3. Active methodologies — listed before templates. Name, practice area, and one-line description of when to use it. Methodologies and templates are equally weighted in terms of importance, but methodologies reflect the majority of eventual production volume and should not be subordinated to templates in the presentation.

4. Active templates — name, format type, and a brief list of use cases.

5. Available brand packages — full client name list, not a count.

6. Permission-tier addendum — rendered only if the caller's tier is `practice_leader` or `admin`. Appended after the standard response, not interleaved. Example framing: "Because you're an editor on the platform, you can also..." Surfaces: ability to see full methodology content including system instructions and quality gates, ability to save data back to Alexandria from inside Claude via write tools, and any other elevated capabilities relevant to their tier.

7. Intent-driven follow-ups — a short set of suggested next steps rendered as prompts the practitioner can send. These should reflect what people actually do next, not a comprehensive menu. Examples: "I need to build a post-discovery brief," "I need an HTML deliverable for [client]," "Show me what brand packages are loaded," "I need to build something Alexandria doesn't have a methodology for."

### What the tool does NOT do

`alexandria_help` does not describe capabilities that don't exist yet. It reflects current Sanity content — templates, methodologies, and brand packages that are actually active. As content grows, the response grows automatically because it pulls live from Sanity, not from hardcoded strings in the MCP tool.

Do not build a separate `alexandria_what_can_you_do` tool. This tool handles both use cases.

---

## Unsupported Request Flow

When a practitioner asks Alexandria to produce something it doesn't have a methodology or template for, the response follows this pattern:

> Alexandria doesn't currently have a methodology or template for this deliverable. I'm happy to help you build it — and we should still use what Alexandria does have, including your brand package and quality frameworks, even if the deliverable itself isn't coming from a sanctioned template. Want me to proceed?

This is not a refusal. It's a transparent handoff that keeps Alexandria assets in the loop even when the production path falls outside it.

Every unsupported request must be logged. See the Request Logging section below.

---

## Sanity Schema Changes

Add a `platformGuide` singleton document type to Sanity. This is the content home for everything `alexandria_help` returns that isn't pulled dynamically from other content types.

**Fields:**

- `canonicalEntryPrompts` — array of entry prompt strings. The required "I need to build a [deliverable type] from Alexandria" pattern lives here, not hardcoded in the MCP tool.
- `examplePrompts` — array of example prompts for common use cases, each following the generic entry pattern. Authored in Sanity, not hardcoded. Brandon seeds, practice leaders can update via portal.
- `platformIntro` — short text field. The one or two sentence description of what Alexandria is. Authored in Sanity so it can be updated as the platform evolves without a code deploy.

The `platformGuide` document is a singleton — one document, always present, not a list.

---

## Request Logging

Every MCP tool call to Alexandria must be logged to PostgreSQL. This is not optional and is not scoped only to `alexandria_help` — it applies to all Alexandria tool calls.

**Log schema — `alexandria_request_log` table:**

| Column | Type | Description |
|---|---|---|
| `id` | serial primary key | |
| `user_id` | text | Object ID from Azure AD session |
| `permission_tier` | text | practitioner, practice_leader, admin |
| `tool_name` | text | Which MCP tool was called |
| `request_summary` | text | What the practitioner asked for, in brief |
| `matched_capability` | boolean | Did Alexandria have a template or methodology for this? |
| `capability_type` | text | template, methodology, brand_package, or null |
| `capability_id` | text | Sanity document ID of the matched content, if any |
| `created_at` | timestamptz | |

**Unsupported requests** — where `matched_capability = false` — are the priority data. These represent production jobs that practitioners attempted but Alexandria couldn't fulfill. They are the primary input for deciding what to build next.

Reporting surface: deferred to Step 6 dashboards. The data is captured now; the portal view comes later. No n8n routing, no Slack digest at this stage.

---

## Build Items

| Item | Type | Notes |
|---|---|---|
| `alexandria_help` MCP tool | MCP | Returns structured payload; tier-aware |
| `platformGuide` Sanity schema | Sanity | Singleton document type |
| Seed `platformGuide` document | Content | Canonical entry prompts, example prompts, platform intro |
| `alexandria_request_log` table | PostgreSQL | Captures all MCP tool calls |
| Request logging middleware | MCP | Applied to all tool handlers, not just `alexandria_help` |
| Unsupported request flow | MCP + Claude behavior | Log + transparent handoff response |

---

## Dependencies

- Step 2 intake enforcement complete (session-gated flow). The canonical entry prompt references the intake flow directly — if intake isn't enforced, the entry prompt instruction has no teeth.
- `platformGuide` content seeded before `alexandria_help` goes live.

---

## What Success Looks Like

A practitioner opens Claude and asks "what can Alexandria do?" They get a response that reflects current platform capabilities accurately, shows them exactly how to start a production job, and surfaces relevant brand packages and methodologies. They don't need to remember their training. They don't need to ask Brandon.

When they ask for something Alexandria can't do, they know it immediately, they understand what Alexandria can still contribute to that job, and the gap is logged for future platform development.

When a practice leader asks the same question, they see everything a practitioner sees, plus a clear statement of their additional capabilities — without needing a separate training or documentation.
