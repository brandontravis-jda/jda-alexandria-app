# KIRU: What One Person and AI Tools Can Build in a Day
## A JDA Worldwide Internal Case Study
### Brandon Travis, VP of Development + AI · February 2026

---

## The Question

> *What can AI actually do for an agency right now? Not in theory. In practice. Today.*

That was the brief. Not "explore AI tools." Not "evaluate vendors." A single stress test: take a fictional restaurant from nothing to a complete agency go-to-market package — the kind of work JDA would normally charge a client $500K+ for across a 9–12 month engagement — and do it in a day with a stack of AI tools totaling less than $400/month.

The proof-of-concept: **KIRU**, a fictional boutique chef-driven sushi bar on Mass Ave in Indianapolis.

**Live deliverables:** [kirutoday.com](https://kirutoday.com) · [showcase.kirutoday.com](https://showcase.kirutoday.com)

---

## The Approach

This was not a demo. It was a deliberate stress test of AI's current capabilities and limitations in a professional agency context.

Every deliverable on the showcase was held to a single quality benchmark: *Would this pass review in a real JDA client presentation?* If no, we iterated until yes.

**The workflow pattern was spec-first.** Claude generated detailed briefs, specifications, and copy that downstream tools — Cursor for code, Midjourney for imagery, ElevenLabs for voice — executed against. This isn't "vibe coding" or "prompt and hope." It's structured orchestration: Claude as the strategic and creative brain, specialized tools as production execution.

**The session architecture:** Approximately 10 Claude sessions across the project lifespan. Claude's project knowledge feature maintained brand context across all sessions, ensuring every deliverable — from the 404 page copy to the crisis communications framework — remained tonally and strategically consistent.

---

## The Brief (What Was Needed)

A new restaurant on Mass Ave needs everything:

| Category | Deliverables |
|---|---|
| Brand Strategy | Positioning, audience, competitive analysis, concept selection |
| Brand Identity | Color, typography, voice, messaging framework |
| Logo System | Wordmark, kanji seal, lockups, favicon — all vector |
| Website | 40+ pages, full functionality, production-grade |
| Online Ordering | Cart, checkout, Stripe integration |
| Reservation System | 4-step flow, calendar, confirmations |
| Loyalty Program | Points, tiers, redemption, QR membership card |
| Admin Dashboard | Revenue reporting, CRM, order management |
| Full Menu | 26 items with origin stories, pricing, dietary tags |
| Copy | 800+ lines across all pages, emails, social, and print |
| Email System | 8 branded HTML templates |
| Social Content | 35+ posts, 30-day calendar |
| Ad Copy | 12 variants across Meta, Google, TikTok |
| Brand Video | 45-second brand film with voiceover |
| PR Package | Press release, media pitches, target list |
| Paid Media Strategy | 4-channel plan with KPIs |
| In-Restaurant Collateral | Table cards, chopstick sleeves, WiFi card, to-go insert |

Historically: **9–12 months. A team of 15+ specialists. A starting price north of $500K.**

---

## What Was Built — Phase by Phase

### Phase 1: Strategy & Brand Foundation
**Tool: Claude · Time: ~45 minutes**

Three complete brand concepts were developed, each with full competitive analysis, audience personas, and visual direction. **Concept B — "Hometown Outsider"** was selected:

- Brand story: an Indianapolis native who left at 22, trained for years across Tokyo, Osaka, Seoul, and Bangkok, and came home to build something that carried all of it
- Tagline: *"Born in Indy. Sharpened in Tokyo. Served on Mass Ave."*
- Target audience: young professionals and creatives, 25–35, Instagram-first, $25–50/person price point
- Brand personality: warm storytelling, founder-driven narrative, Indy pride + global polish
- Color palette: Deep Indigo (#2C3E50), Washi Cream (#E8DDD3), Terracotta (#C0785C), Nori Green (#4A5D4F), Warm Black (#1A1A1A)
- Typography: Playfair Display (headlines), DM Sans Light (body), Noto Serif JP (Japanese characters)
- Drink program name: **Souvenir** — story-driven sake and cocktails
- Interior concept: industrial-warm hybrid, open kitchen, travel-inspired details

**Key prompt pattern:** Claude was asked to generate three differentiated brand directions with full rationale for each — not just names and colors, but the emotional logic and business positioning behind each concept. This gave a real decision to make, not just options to pick from.

---

### Phase 2: Visual Identity
**Tools: Claude, Midjourney, Cairo/Python · Time: ~60 minutes**

- **Logo system:** Kanji seal (切), wordmark, three lockup variants, favicon — all generated as HTML/SVG artifacts and then converted to pure vector paths using Cairo/Python (Noto Serif CJK JP confirmed installed; all text elements outlined to eliminate font dependencies)
- **Brand imagery:** 23+ Midjourney images across food photography, interior atmosphere, and lifestyle contexts; 30+ iStock images for menu
- **Midjourney prompt system:** Two prompt sheets anchored to a hero reference image (2A) for visual consistency across all generations
- **Menu photography prompts:** 42 individual item prompts with consistent lighting, surface, and composition direction
- **Social template specs:** Format and layout direction for Stories, Reels covers, and feed posts

**Noted limitation:** Midjourney cannot accurately render specific kanji characters or custom brand marks. The hanko seal and wordmark in brand application mockups will require a designer to composite real SVG files onto generated environments. This is the current ceiling of image generation for brand-specific work.

---

### Phase 3: Website Build
**Tools: Claude (spec), Cursor (build), Supabase, Stripe, Resend, Vercel · Time: ~3–4 hours**

The original spec called for a restaurant website. **What got built was a restaurant.**

A 1,246-line specification was handed to Cursor. The output dramatically exceeded the spec:

**Customer-facing (40+ pages):**
- Homepage, Our Story, Chef's Table, Souvenir Bar, Reservations, Contact, Press, Private Events, 404
- Interactive menu with category and dietary filtering
- Full ordering system with Stripe checkout, cart management, and order history
- 4-step reservation system with date picker, time slots, party size, and confirmation
- User accounts with Google, Apple, and Facebook OAuth
- Favorites, ratings, reviews, and order history
- **"A Cut Above" loyalty program:** auto-enrollment on signup, 1 point per $1 spent via Stripe webhook, 4-tier reward redemption, QR membership card for in-restaurant scanning, birthday entree perk

**Operations layer:**
- Admin dashboard with reservation calendar and status pipeline
- Order management with status tracking
- Full menu CRUD with availability toggles
- Customer CRM with order/spend/reservation statistics
- Revenue reports with 30-day trend charts

**Email system (8 branded HTML templates via Resend):**
- Reservation confirmation with ICS calendar attachment
- Auto-triggered order confirmation via Stripe webhook
- 3-email welcome series
- Post-visit follow-up
- Staff account notifications

**Tech stack:** Next.js · Tailwind CSS · Supabase · Stripe · Resend · Zustand · Vercel

**The reframe:** "The spec called for a restaurant website. What got built was a restaurant." This became the defining line of the showcase — a demonstration that a well-written spec handed to a capable AI tool can return something that far exceeds the original ask.

---

### Phase 4: Content & Copy
**Tool: Claude · Time: ~45 minutes**

785 lines of brand-consistent copy delivered in a single session:

| Deliverable | Detail |
|---|---|
| Website copy | All pages: Homepage, Our Story, Chef's Table, Souvenir Bar, Reservations, Contact, Press, 404 |
| Full menu | 26 items — nigiri, rolls, sashimi, small plates, omakase, cocktails, sake — each with origin story, dietary tags, and pricing |
| Email sequences | Welcome ×3, reservation confirmation, post-visit, order confirmation, newsletter |
| SMS templates | 6 templates with kanji signature: reservation reminders, flash specials, event alerts, limited drops |
| Social content | 35+ posts with full captions, 30-day calendar across Instagram, TikTok, and Stories + hashtag strategy |
| Ad copy | 5 Meta variants, 4 Google Search variants, 3 TikTok variants |
| In-restaurant | Founder's note, table cards, receipt messages, 5 chopstick sleeve stories, WiFi card, to-go bag insert |

**The 404 page, as an example of the voice work:**
> *"Looks like you got lost. We know the feeling — we spent three years lost in Tokyo. Best thing that ever happened to us."*

**Key prompt pattern:** Claude was given the complete brand guidelines document at the start of the session and asked to treat every piece of copy as if it had been written by someone who had read nothing but those guidelines for a week. The output required almost no revision — the voice held across 800+ lines.

---

### Phase 5: Video & Animation
**Tools: ElevenLabs, Runway, Pixabay, CapCut · Time: ~90 minutes**

- **Voiceover:** Two ElevenLabs recordings (35-second brand cut, 20-second social cut). Output described as indistinguishable from professional voice talent at broadcast quality.
- **Video clips:** ~15–20 Runway Gen-4.5 clips generated from food-and-atmosphere-only prompts. Approximately 3 clips were usable out of 40+ generations; the rest were supplemented with stock footage.
- **Music:** Sourced from Pixabay — professional-quality cinematic tracks at no cost.
- **Assembly:** Brand video assembled, color-graded, and exported in CapCut at $8/month. Logo animation (seal fade-in → hold → wordmark fade-in → reveal) built from scratch in CapCut.

**Noted limitation:** Runway is the youngest technology in the stack and the most visible gap. Video generation quality was inconsistent and required heavy supplementation with stock footage. A $50/day stock footage subscription would produce more reliable results at this stage.

**CapCut UI friction note:** Initial assembly instructions were written against UI elements that didn't match the actual CapCut desktop interface, requiring multiple rounds of revision. A reminder to validate tool-specific UI guidance carefully before writing step-by-step instructions — Claude's training data on specific desktop application interfaces can drift from current product state.

---

### Phase 6: PR & Paid Media
**Tool: Claude · Time: ~30 minutes**

A launch-ready media and community strategy — not a plan, but an executable package:

**PR Package:**
- AP-style press release (distribution-ready)
- 3 media pitch email variants (food reporter, lifestyle, podcast)
- 20+ Indianapolis media targets across 4 tiers (major food media, lifestyle & culture, podcasts & blogs, national & trade)
- Founder fact sheet
- Founder talking points and interview prep
- Crisis communications framework (4 scenarios + escalation matrix)

**Paid Media Strategy ($3–5K/month):**
- 4-channel allocation: Meta (50%), Google (25%), TikTok (15%), Yelp/GBP (10%)
- Attribution model
- 4 ad creative briefs (brand video, food carousel, Stories, Google Display)
- KPI framework with Month 1 and Month 3 targets

**Community Playbook:**
- Voice & tone for social response
- Response templates (positive, neutral, negative)
- UGC guidelines
- Escalation protocol
- Moderation rules
- 25 Indianapolis food/lifestyle influencer targets with outreach templates

---

### Phase 7: The Showcase
**Tools: Claude (spec + copy), Cursor (build)**

Both the primary brand site and the showcase/case study site were built and are live:

- **kirutoday.com** — the brand site, functioning as a real restaurant's digital presence
- **showcase.kirutoday.com** — the meta-deliverable: a case study that presents every deliverable, the honest tool assessment, the numbers comparison, and the implication for JDA

**Showcase page architecture decisions:**
The page was deliberately structured to lead with a brand reveal before foregrounding the AI angle. A visitor's first experience is KIRU as a restaurant. The AI/agency context emerges through "The Brief" and "The Approach" sections — creating a more honest and effective demonstration than leading with "we built this with AI."

**The Approach section copy** was revised in the final session to accurately frame this as a stress test — not a perfection showcase. The original draft contained a line ("no shortcuts on craft") that was flagged as inaccurate and removed. The honest framing is the point. Credibility comes from transparency, not overselling.

---

## The Numbers

| | Traditional Engagement | KIRU |
|---|---|---|
| **Timeline** | 9–12 months | 1 day |
| **Team** | 15+ specialists | 1 person |
| **Cost** | $500K+ | ~$390/month |
| **Pages built** | — | 40+ |
| **API endpoints** | — | 34 |
| **Lines of copy** | — | 800+ |
| **Images generated** | — | 50+ |
| **Email templates** | — | 8 |
| **Social posts** | — | 35+ |
| **Ad variants** | — | 12 |

### Tool Stack

| Tool | Role | Cost | Rating |
|---|---|---|---|
| Claude Max | Strategy, copy, specs, all written content | $100/mo | ★★★★★ |
| Cursor Pro | Website + showcase build | $200/mo | ★★★★★ |
| Pixabay | Images, video, music | Free | ★★★★★ |
| ElevenLabs | Voiceover | $22/mo | ★★★★ |
| Midjourney | Brand imagery, food photography, environmental mockups | $10/mo | ★★★ |
| CapCut Pro | Video assembly, logo animation | $8/mo | ★★★ |
| ChatGPT Plus | Ideation, brainstorming | $20/mo | ★★ |
| Runway Pro | AI video clip generation | $28/mo | ★ |

**Total new subscriptions: ~$388/month**

---

## What Worked

**Spec-first prompting is the core unlock.** The workflow that made this project possible wasn't "ask AI to do things." It was: write a detailed specification, hand it to the right tool, and let the tool execute. Claude generating a 1,246-line website spec that Cursor built from is the most important pattern in the project. The blank page never existed — only increasingly refined specifications.

**Brand consistency at scale is solved.** 800+ lines of copy across a dozen distinct formats — web, email, social, print, SMS, in-restaurant — held a single voice. The limiting factor was the quality of the original brand brief, not the AI's ability to stay in character.

**Strategy and copy are production-ready.** The written work — brand strategy, positioning, copy, PR materials — required minimal revision. This is where AI has most clearly reached professional-quality output.

**Claude's project knowledge feature as persistent context.** Running a multi-session project through a single Claude project kept the brand system coherent across ~10 sessions. Every session started with context already loaded.

---

## What Didn't Work

**Video generation isn't ready for production.** Runway's output was inconsistent — approximately 3 usable clips out of 40+ generations. Stock footage filled the gap. This is the most visible ceiling in the current AI tool stack.

**Midjourney cannot render brand-specific marks.** The hanko seal and wordmark cannot be accurately generated by Midjourney. Brand application mockups showing the actual logo in real environments require a human designer to composite SVG files onto generated backgrounds. AI image generation is powerful for controlled scenarios (food photography, atmospheric shots) and significantly weaker for brand-accurate environmental compositing.

**Tool-specific UI documentation drifts.** Claude's instructions for CapCut desktop referenced interface elements that didn't match the current product. Any step-by-step instructions for specific tool UIs need to be validated against the live interface, not written from training data.

---

## The Key Takeaway

> *The job has shifted from production to curation. The person in the loop isn't the one doing the work — they're the one deciding what good looks like.*

AI has essentially solved the production layer for strategy, copywriting, and code generation. The output is professional-quality. The leverage is real. What remains irreplaceable is the strategic thinking, creative taste, client judgment, and relationship context that define what good looks like in the first place.

This isn't a threat to the JDA team. It's a preview of what the JDA team becomes — a small group of senior thinkers producing the volume of work that previously required 15+ specialists, in the time it previously took to write the SOW.

**The agencies that figure this out first will win.** Not because AI output is perfect — this case study is honest about where it falls short — but because the leverage ratio is too large to ignore.

*Read Dreams. Slay Giants. — Now with AI.*

---

*Built by Brandon Travis, VP of Development · JDA Worldwide · February 2026*
*Live at [showcase.kirutoday.com](https://showcase.kirutoday.com)*
