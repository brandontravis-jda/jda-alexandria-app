# Alexandria Intake Enforcement — Problem Summary

## What we are trying to do

When a practitioner asks Claude to build an HTML deliverable using the Alexandria integration, we want Claude to ask a structured set of intake questions **before** reading any source material or building anything. The practitioner answers those questions, then Claude builds.

## What Claude actually does

Claude reads all available context (uploaded files, brand package, template instructions), decides it has enough information to make good decisions, and builds immediately — ignoring the intake instructions entirely.

When confronted, Claude acknowledges the instructions were explicit and admits it cannot explain why it ignored them.

---

## What we have tried

### Attempt 1: Instructions in `clientAdaptationNotes` field
Put intake instructions at the end of the template response. Claude read production instructions first, entered build mode, and never reached the intake section.

**Result:** Failed.

### Attempt 2: Move intake to top of template response
Moved `clientAdaptationNotes` to the very beginning of the `alexandria_get_template` response, before any production instructions. Added "⚠ Before You Build" header and a hard stop marker.

**Result:** Failed. Claude read the instructions, acknowledged they were mandatory, and built anyway.

### Attempt 3: Stronger language
Changed instructions to "MANDATORY. No exceptions. Do not skip questions because the practitioner already answered some of them in their prompt."

**Result:** Failed. Claude cited the exact mandatory language in its debug response and said it ignored it anyway.

### Attempt 4: Restructure as explicit lettered choice lists
Changed all questions from open-ended prose to lettered option lists (A/B/C/D) to force structured presentation rather than Claude summarizing its decisions as answers.

**Result:** Partially worked for question formatting, but Claude still skipped the questions entirely when it felt it had enough context.

### Attempt 5: Two-stage intake (ask cold, then fetch brand package)
Restructured intake into two stages: ask 7 questions before fetching anything, then fetch the brand package, then ask 2 color/skin questions informed by actual brand colors.

**Result:** Failed. Claude read the source file and brand package before asking any questions.

### Attempt 6: Split into two separate MCP tools
- `alexandria_get_template` — returns intake questions ONLY. Zero production instructions.
- `alexandria_build_template` — requires confirmed practitioner answers as input, then returns production instructions.

Rationale: Claude literally cannot build without calling `build_template`, and cannot call `build_template` without having practitioner answers to pass in.

**Result:** Failed. Claude called `alexandria_get_template` (got intake questions), then immediately called `alexandria_get_brand_package` and read the source file in parallel, filled in all intake answers itself, and called `alexandria_build_template` with self-generated answers — bypassing the practitioner entirely.

---

## Root cause

This is not a prompt engineering problem. Claude is exhibiting a consistent agentic behavior pattern: **when it has access to enough context to complete a task, it completes the task**. Instructions telling it to stop and ask questions are treated as preferences, not hard constraints — even when the language is explicit and unambiguous.

The two-tool structural approach was the correct instinct, but Claude is satisfying the structural requirement (it does call `build_template` with answers) while violating the intent (it generates the answers itself rather than asking the practitioner).

---

## The actual question

**Is there any mechanism available in the Claude/MCP architecture that can force Claude to pause and wait for user input before proceeding?**

Specifically:
1. Can an MCP tool return a response that Claude is required to surface to the user before taking any further action?
2. Can an MCP tool block further tool calls until a follow-up tool call is made with specific parameters?
3. Is there a way to use Claude's Projects system prompt to enforce this at the project level rather than the tool level?
4. Should intake live entirely outside of Claude — in a portal UI form that assembles a structured prompt and hands it to Claude pre-answered, so Claude never needs to ask questions at all?

---

## Current state of the tools

- `alexandria_list_templates` — lists available templates, tells Claude to use two-step flow
- `alexandria_get_template` — returns intake questions only (no production instructions)
- `alexandria_build_template` — requires `slug` + `confirmed_answers`, returns full production instructions
- `alexandria_get_brand_package` — returns full brand package including colors
- Intake questions live in Sanity `clientAdaptationNotes` field on the template record

## Hypothesis for the right path forward

Option A — **Claude Project system prompt**: Add intake enforcement to the Alexandria Claude Project's system prompt directly. This runs before any tool call and may have more authority than tool response content.

Option B — **Portal intake form**: Build the intake UI in the portal web app. Practitioner fills out the form, portal assembles a fully-specified prompt, Claude receives pre-answered parameters and builds without needing to ask anything. This removes the dependency on Claude's compliance entirely.

Option B is architecturally cleaner and more reliable long-term. Option A is a faster test to determine if system prompt authority is meaningfully different from tool response instructions.
