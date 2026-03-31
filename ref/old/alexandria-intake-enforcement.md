# Alexandria Intake Enforcement — Implementation Recommendations

## Context

This document captures architectural decisions made to solve the intake enforcement problem in Alexandria's HTML deliverable production flow. The root cause is not a prompt engineering failure — it is a Claude behavior pattern: when Claude has sufficient context to complete a task, it completes the task. Instructions telling it to pause are treated as preferences, not constraints. The recommendations below address this at the structural level.

---

## 1. `alexandria_get_template` — Revised Behavior

### Current behavior
Returns full production instructions including `clientAdaptationNotes`. Claude reads everything, decides it has enough context, and builds immediately.

### Required behavior
`alexandria_get_template` should return **intake questions only** — no production instructions, no layout guidance, no brand injection rules. Nothing Claude can use to begin building.

### What the response must include
- The intake questions for the requested template, structured as lettered option lists where choices apply
- A `session_id` generated server-side at the moment of the call
- Explicit instruction to Claude that it must collect practitioner answers before calling any other Alexandria tool

### What the response must NOT include
- Any production instructions
- Any layout or component guidance
- Any quality check criteria
- Anything that could serve as a build scaffold

### Enforcement note
The intake questions should be the only content Claude has to work with after this call. If there is nothing to reason from, there is nothing to complete.

---

## 2. Session State — Server-Side Gate

### Architecture

Add a `sessions` table to the Railway Postgres instance with the following structure:

```
session_id        uuid, primary key
template_slug     text
practitioner_id   text (or conversation identifier if available)
status            enum: awaiting_intake | intake_complete
answers           jsonb (null until submitted)
created_at        timestamptz
submitted_at      timestamptz
```

### Tool flow

**`alexandria_get_template`**
- Generates a new `session_id`
- Inserts a row with `status: awaiting_intake`
- Returns only the intake questions + `session_id`

**`alexandria_submit_intake`** (new tool)
- Accepts `session_id` + practitioner answers as structured parameters
- Validates that all required answer fields are present and non-empty (minimum character threshold to reject single-word fabrications)
- Updates session row to `status: intake_complete`, stores answers in `answers` jsonb
- Returns a confirmation summary of what was received, with explicit instruction to Claude to confirm these answers with the practitioner before proceeding

**`alexandria_build_template`**
- Requires `session_id` as a parameter
- On call, checks Postgres: if session status is `awaiting_intake`, returns an error response — not a warning, a hard refusal — instructing Claude that it cannot proceed until intake is complete
- If status is `intake_complete`, returns full production instructions with the confirmed answers injected into the build context

### Why this works
Enforcement moves from "Claude following instructions" to "server rejecting invalid state transitions." These are different reliability classes. Claude cannot fabricate a valid `session_id` with `intake_complete` status — the server controls that state.

---

## 3. Required Gate Parameters for `alexandria_build_template`

The following parameters must be supplied to `alexandria_build_template`. Every one of them is impossible to derive from a generic starting prompt, which means Claude cannot satisfy them without practitioner input.

| Parameter | Type | Purpose |
|---|---|---|
| `session_id` | uuid | Must match a server-side session with `intake_complete` status |
| `client_name` | string | Not inferrable without being told |
| `source_content_description` | string | What the content is and where it came from |
| `layout_mode` | enum: scroll / slide / tabbed | A choice only the practitioner can make |
| `primary_cta` | string | What the deliverable should make the audience do |
| `confirmed_by_practitioner` | boolean | Explicit confirmation flag set during intake submission |

Any call to `alexandria_build_template` missing these parameters should be rejected by the server with an instructive error response telling Claude exactly what is missing and directing it back to the intake flow.

---

## 4. Generic Entry Prompt — Revised Practitioner Convention

### The core insight
Claude's agentic completion drive only fires when it has enough context to complete a task. An underspecified starting prompt has nothing to complete. This is not a workaround — it is working with Claude's behavior rather than against it.

### Old pattern (do not use)
> "I need an HTML deliverable for Prolific using this content [attached file]"

This gives Claude a client name, a content source, and a format type. It has enough to attempt a build.

### New pattern (required)
> "I need to build an HTML deliverable from Alexandria"

No client. No content. No layout preference. No brand context. Claude calls `alexandria_get_template`, gets intake questions and a `session_id`, and asks the practitioner because asking is the only available action.

### Practitioner training note
This convention should be documented in `alexandria_help` as the canonical entry point for all HTML deliverable production. Example prompts stored in Sanity should follow this pattern exclusively. The old pattern should not appear in any example prompt.

---

## 5. Step 3 — Revised Scope for `alexandria_help`

### What changes

The `alexandria_help` tool is no longer just a discovery surface. It is the entry point that establishes the correct production pattern. Its response must include the generic entry prompt convention as a first-class piece of guidance — not buried in documentation, presented as the canonical way to start.

### Recommended response structure for `alexandria_help`

1. What Alexandria is and what it does
2. Active templates with format type and use case
3. Active methodologies with practice area and when to use
4. Available brand packages (client list)
5. **How to start a production job** — the generic entry prompt, presented explicitly
6. Example prompts for common use cases (all following the generic pattern)

### On example prompt storage
Example prompts should live in Sanity, not hardcoded in the MCP tool. They are the same class of content as templates and brand packages — maintained by the Alexandria admin, not by a Cursor session. Add an `examplePrompts` array field to the relevant Sanity schema.

### On `alexandria_what_can_you_do`
Do not build this as a separate tool. `alexandria_help` with a well-structured tiered response handles both the beginner and the experienced practitioner. One tool, one entry point.

### Revised Step 3 dependency
Step 3 currently lists "Discovery session required before building." That dependency is resolved by this document. The generic entry prompt convention replaces the need for a separate discovery session to establish intake behavior. Step 3 can proceed to build without waiting on a discovery session, provided the `alexandria_help` response structure above is implemented.

---

## Summary — What to Build

| Item | Type | Priority |
|---|---|---|
| Revise `alexandria_get_template` to return questions + `session_id` only | MCP tool change | P0 |
| Add `sessions` table to Railway Postgres | DB migration | P0 |
| Build `alexandria_submit_intake` tool | New MCP tool | P0 |
| Add session status gate to `alexandria_build_template` | MCP tool change | P0 |
| Add required gate parameters to `alexandria_build_template` | MCP tool change | P0 |
| Update practitioner entry prompt convention in `alexandria_help` | Content + tool | P1 |
| Add `examplePrompts` field to Sanity schema | Schema change | P1 |
| Document generic entry prompt as canonical pattern | Sanity content | P1 |
