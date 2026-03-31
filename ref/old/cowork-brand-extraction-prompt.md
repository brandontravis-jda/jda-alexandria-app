# Alexandria Brand Package Extraction

## Task

Read the brand standards PDF in this folder and produce a distilled brand package markdown file that can be loaded into Alexandria. This must capture everything Claude needs to produce on-brand client deliverables — and nothing Claude doesn't need.

## What to Extract

### 1. Identity

- **Client name** — the organization's full name and any common abbreviations
- **Tagline / positioning line** — if one exists
- **Brand personality** — the 3-5 word description of how the brand presents itself (e.g., "Authentic Servant Leader")
- **Brand voice** — how the brand speaks (e.g., "Inspired, Dignifying Expertise")
- **Brand experience** — how interactions with the brand should feel (e.g., "Active, Trusted Support")

### 2. Color Palette

Extract every named color with its hex value. Organize by role:

- **Primary palette** — the main brand colors (typically 2-4)
- **Secondary palette** — supporting colors
- **Accent colors** — if defined separately
- **Background colors** — any specified background treatments
- **Colors to avoid** — if the guide specifies any

Format as a clean table: Color Name | Hex Value | Role/Usage

### 3. Typography

- **Primary heading font** — name, weights used, any sizing rules
- **Body font** — name, weights used, any sizing rules
- **Accent / display font** — if one exists, plus usage rules (e.g., "one appearance per page maximum")
- **Font pairing rules** — any guidance on how fonts work together
- **Web font availability** — note if fonts are Google Fonts, Adobe Fonts, custom/licensed, or unknown

### 4. Voice and Tone

- **Overall voice description** — how the brand sounds across all communications
- **Tone by audience** — if the guide specifies different tones for different audiences (donors vs. general public vs. partners, etc.), capture each
- **Tone by context** — if the guide specifies different tones for different situations (crisis vs. celebration vs. education, etc.), capture each
- **Words and phrases to use** — any specified preferred language
- **Words and phrases to avoid** — any specified language restrictions
- **Writing style rules** — sentence structure preferences, formality level, use of pronouns, etc.
- **Verbal examples** — any example copy provided as "this is how we sound" (include 2-3 short examples if available)
- **Undermining traits** — if the guide defines what the brand should NOT sound like, capture those (these are often more useful than the positive traits)

### 5. Brand Architecture (if applicable)

- **Parent brand vs. sub-brands** — how the organization's various entities relate
- **Linkage rules** — which entities should be closely associated with the parent brand and which should be distinct
- **Endorsement rules** — when and how to reference the parent brand from sub-brands
- **Restrictions** — any specific rules about what should NOT be associated publicly (e.g., "do not use the parent brand endorsement on anything client-facing for [sub-brand]")

### 6. Visual Direction

- **Photography style** — described qualities (warm, natural light, authentic, etc.)
- **Imagery guidelines** — what kind of images reinforce the brand vs. undermine it
- **Layout principles** — any specified spatial or compositional preferences
- **Logo usage** — primary logo, secondary marks, minimum sizes, clear space rules, color variants (describe the rules; don't embed the image files)

### 7. Key Messaging

- **Mission statement** — exact text
- **Vision statement** — exact text
- **Value proposition** — exact text
- **Elevator speeches** — if the guide provides standard descriptions at different lengths (short / medium / long), include all of them verbatim
- **Core values** — listed
- **Key statistics** — any numbers the brand uses regularly (e.g., "4,000+ affiliates worldwide," "2 million connections through Option Line")

## Output Format

Produce a single markdown file named `[client-slug]-brand-package.md` (e.g., `heartbeat-international-brand-package.md`).

Structure it with clear headers matching the seven sections above. Use tables for color palettes and typography specs. Use blockquotes for verbatim brand language (elevator speeches, mission/vision). Keep everything else as concise, scannable prose.

The total file should be **under 5,000 words**. This is a reference document for an AI production system, not a reproduction of the brand guide. Distill, don't duplicate. If a section of the brand guide is 10 pages of examples and rationale, the brand package captures the actionable rules in a paragraph.

## What NOT to Include

- Don't reproduce the full brand guide. Distill it.
- Don't include page numbers, section numbers, or navigation references from the PDF.
- Don't include rationale or background explanations for why brand decisions were made — just the decisions themselves.
- Don't embed images. Describe logo usage rules in text.
- Don't include content about brand guide production process (how the guide was made, who was involved, research methodology).

## After Extraction

Save the markdown file to this folder. Then tell me:
1. Which sections were fully captured
2. Which sections had partial or missing information in the PDF
3. Any brand rules that seem particularly important for AI-driven content production (things Claude would need to know to avoid common mistakes)
