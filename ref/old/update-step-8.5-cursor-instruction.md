# Cursor Instruction: Update Step 8.5 in portal-implementation-plan.md

## What to do

Replace the entire Step 8.5 section (from `### Step 8.5: Claude Skills Strategy` through `**Depends on:** Step 7...`) with the updated version below. The section ends just before `### Step 9: Claude Project Setup Wizard`.

Preserve all surrounding content exactly as-is. Do not modify any other steps.

---

## Replacement content

### Step 8.5: Extending Claude — Full Discovery Required

**Status:** NOT STARTED. The previous version of this step was written before Anthropic shipped plugins, desktop extensions, the unified directory, skill sharing, and enterprise governance controls for most of these surfaces. The assumptions in the prior version are outdated. This step needs a full discovery session built from current Anthropic documentation and product surfaces, not from prior assumptions.

**What this step covers:** A deliberate strategy for how JDA configures, governs, and trains practitioners on the four mechanisms for extending Claude's capabilities. Each has its own admin surface, governance model, distribution mechanism, and security profile. All four need to be evaluated before the May 11 launch.

**The four extension mechanisms (as of April 2026):**

| Mechanism | What it is | Where it runs | Org governance |
|---|---|---|---|
| **Skills** | SKILL.md instruction packages that teach Claude procedural knowledge for specific tasks. Load dynamically when relevant. | Chat, Cowork, Claude Code, API | Org-provisionable by admin (enabled or disabled by default). Peer sharing and org-wide sharing toggleable independently. Partner directory (Notion, Figma, Atlassian, Canva, etc.). |
| **Connectors** | Cloud-hosted remote MCP servers. OAuth-authenticated. | claude.ai, desktop app, Claude Code | Configured at org level or individually. This is where Alexandria lives alongside M365, Slack, Google, Fireflies, etc. 50+ in the directory. |
| **Extensions** | Locally-installed MCP servers packaged as .MCPB files (formerly .DXT). Run on the practitioner's machine with full system privileges. One-click install. | Desktop app only | Enterprise allowlists, blocklists, private extension distribution. Security implications: extensions run unsandboxed with full host system access. |
| **Plugins** | Bundles that package skills, slash commands, agents, and MCP servers into a single installable unit. | Cowork, Claude Code | Private marketplaces, per-team provisioning, auto-install. Marketplace launched February 2026. |

**How Alexandria fits:** Alexandria is a Connector (cloud-hosted MCP server, org-level config, per-user OAuth). It carries live production content: methodologies, brand packages, templates, capabilities matrix, quality checklists. Skills carry persistent behavioral instructions (JDA voice, writing standards, meeting note format). The two are complementary. Extensions and Plugins are additional surfaces that may or may not be relevant to JDA's practitioner experience at launch.

**What the prior version got right (preserve these ideas):**

- The distinction between org-provisioned skills and personal skills is valid and confirmed by current product behavior
- The candidate org skills (JDA brand voice, meeting note structure, client brief format, quality gate reminders) are still good candidates
- The framing "a skill is a standing brief" is accurate for training
- Alexandria and Skills are complementary, not redundant
- The `alexandria_get_skill` MCP tool concept (session-seeded skills) is still viable but should be evaluated against the native skill sharing features Anthropic has since shipped

**What the prior version got wrong or missed:**

- Assumed Skills were the only extension mechanism. Plugins, Extensions, and the unified directory did not exist when this was written
- Did not account for skill sharing (peer-to-peer or org-wide publishing), which changes the distribution model
- Did not account for the partner skills directory, which may provide ready-made skills JDA should deploy immediately
- No mention of desktop extensions or their security implications (unsandboxed, full system privileges, enterprise allowlist/blocklist controls)
- No mention of plugins as bundled packages of skills + commands + agents
- The three-layer model (built-in / org-provisioned / personal) was accurate for Skills but is not a complete picture of the extension landscape

**Discovery questions (all open, do not assume answers):**

*Skills:*
- Which org-provisioned skills should ship at launch? JDA brand voice and writing standards are the obvious candidates, but validate against current product behavior
- Should skill sharing be enabled org-wide, restricted to admin-provisioned only, or somewhere in between? What's the governance posture?
- Are there partner skills in the directory (Notion, Figma, Atlassian, Canva) that JDA should deploy to practitioners on day one?
- Does the `alexandria_get_skill` tool still make sense given that Anthropic now supports native skill sharing and org directory publishing?
- How do org skills stay current when JDA's brand or processes evolve?

*Connectors:*
- Connector strategy is largely resolved (Alexandria + the standard set from training Session 1). Any gaps?
- Is there anything in the 50+ connector directory that JDA should evaluate?

*Extensions:*
- Does JDA need desktop extensions at launch, or are Connectors sufficient?
- What is the security evaluation and approval process before any extension gets allowlisted?
- Which of the Anthropic-built extensions (PowerPoint, Word, PDF, Filesystem, Control Chrome, Control Mac) should be enabled org-wide vs. left to individual practitioners?
- Does the Figma extension change the existing Figma MCP workflow?

*Plugins:*
- Are plugins relevant to JDA at launch, or is this a post-launch evaluation?
- Is there value in building a JDA plugin that bundles Alexandria skills + connector configuration?
- Does the private marketplace feature have a use case for JDA/Prolific?

*Cross-cutting:*
- What do practitioners need to know about each mechanism in training? The training doc currently mentions Skills and Connectors but not Extensions or Plugins
- How does each mechanism interact with Projects (resolved in Step 7 as optional, practitioner-managed collaboration spaces)?
- What is the admin configuration checklist before May 11? Each mechanism has its own org-level toggles and controls

**Discovery method:** Work through each mechanism using current Anthropic documentation (support.claude.com, claude.com/skills, claude.com/connectors, the desktop app Extensions settings, Claude Code plugin docs). Do not rely on the prior version of this step or on AI-generated summaries. Verify everything against the actual product.

**Depends on:** Step 7 resolved (Claude Project Architecture — confirmed: Chat + Alexandria MCP + org skills is the primary practitioner experience, Projects are optional collaboration spaces). Can begin immediately. Skills Workstream 1 (org skill authoring) can begin without code. Extensions and Plugins evaluation is independent of Alexandria build work.
