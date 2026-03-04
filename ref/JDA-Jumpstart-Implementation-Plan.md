# JDA Catalyst — Implementation Plan

> A step-by-step guide for building the new JDA starter template in Cursor.
> Work through each phase in order. Each phase builds on the previous.

---

## Architecture Decision: Hybrid Monorepo (Template + CLI)

> Decided 2026-03-03. Replaces the old `jda-jumpstart` Gulp/WordPress scaffolding approach.

The project is structured as a **hybrid monorepo** with two packages:

1. **`template/`** — A complete, working Next.js 14+ starter app (the product).
   This is where Phases 1–13 are built. It is always a valid, deployable
   Next.js project that can be run, tested, and iterated on directly.

2. **`cli/`** — A thin npm scaffolding CLI published as `create-jda-catalyst`.
   Developers run `npm create jda-catalyst my-client-site` to copy the template,
   prompt for a few values (project name, Sanity project ID, brand colors),
   do find-and-replace, run `npm install`, and print next steps. Built last,
   after the template is stable.

```
jda-catalyst-npm/            # Monorepo root
├── template/                # Next.js + Sanity starter (Phases 1–13)
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── ...
├── cli/                     # create-jda-catalyst scaffolding CLI (built last)
│   ├── index.js
│   └── package.json
├── ref/                     # Planning & reference docs
│   ├── JDA-Jumpstart-Implementation-Plan.md
│   └── JDA WordPress to React - Modern Web Stack v1.docx
└── README.md                # Monorepo overview
```

**Why this approach:**
- The template is testable and deployable on its own at every phase.
- The CLI is a thin wrapper (~150 lines) — low maintenance.
- Follows the `npm create` convention used by every major framework
  (`create-next-app`, `create-t3-app`, `create-remix`, `create-astro`).
- Replaces the old `jda-jumpstart` pattern of bundling the entire app
  inside the npm package.

**Build order:** Template first (Phases 1–13), CLI last (Phase 14).

---

## Phase 1: Project Scaffolding

> All commands in this phase run inside the `template/` directory.

### 1.1 Initialize Next.js

```bash
cd template
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### 1.2 Install Core Dependencies

```bash
# Sanity
npm install next-sanity @sanity/image-url @sanity/vision @portabletext/react

# Sanity Studio (embedded)
npm install sanity @sanity/dashboard

# Forms & Email
npm install resend

# Utilities
npm install clsx tailwind-merge

# Dev dependencies
npm install -D @types/node eslint-plugin-jsx-a11y prettier eslint-config-prettier
```

### 1.3 Create Directory Structure

```
template/
├── src/
│   ├── app/
│   │   ├── (site)/              # Public site routes (grouped)
│   │   │   ├── layout.tsx       # Site layout (nav + footer)
│   │   │   ├── page.tsx         # Homepage
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx     # Dynamic pages
│   │   │   └── blog/
│   │   │       ├── page.tsx     # Blog listing
│   │   │       └── [slug]/
│   │   │           └── page.tsx # Blog post
│   │   ├── studio/
│   │   │   └── [[...tool]]/
│   │   │       └── page.tsx     # Sanity Studio (embedded)
│   │   ├── api/
│   │   │   ├── contact/
│   │   │   │   └── route.ts     # Contact form handler
│   │   │   ├── revalidate/
│   │   │   │   └── route.ts     # Sanity webhook → ISR revalidation
│   │   │   └── turnstile/
│   │   │       └── route.ts     # Turnstile verification
│   │   ├── layout.tsx           # Root layout
│   │   ├── sitemap.ts           # Dynamic sitemap from Sanity
│   │   └── robots.ts            # Robots.txt
│   ├── components/
│   │   ├── modules/             # Page builder modules
│   │   │   ├── Hero/
│   │   │   │   ├── index.tsx
│   │   │   │   └── types.ts
│   │   │   ├── CTA/
│   │   │   ├── FeatureGrid/
│   │   │   ├── Testimonials/
│   │   │   ├── FAQ/
│   │   │   ├── ContactForm/
│   │   │   ├── TextBlock/
│   │   │   ├── ImageGallery/
│   │   │   ├── VideoEmbed/
│   │   │   ├── TeamGrid/
│   │   │   ├── StatsCounter/
│   │   │   └── LogoBar/
│   │   ├── global/              # Site-wide components
│   │   │   ├── Navigation/
│   │   │   ├── Footer/
│   │   │   ├── SkipLink/
│   │   │   └── SEO/
│   │   ├── ui/                  # Shared primitives
│   │   │   ├── Button/
│   │   │   ├── Container/
│   │   │   ├── SanityImage/
│   │   │   └── PortableText/
│   │   └── PageBuilder.tsx      # Module resolver/renderer
│   ├── sanity/
│   │   ├── schemas/
│   │   │   ├── documents/       # Document types
│   │   │   │   ├── page.ts
│   │   │   │   ├── blogPost.ts
│   │   │   │   ├── teamMember.ts
│   │   │   │   ├── navigation.ts
│   │   │   │   ├── footer.ts
│   │   │   │   ├── globalSettings.ts
│   │   │   │   └── formSubmission.ts
│   │   │   ├── objects/         # Reusable object types
│   │   │   │   ├── hero.ts
│   │   │   │   ├── cta.ts
│   │   │   │   ├── featureGrid.ts
│   │   │   │   ├── testimonials.ts
│   │   │   │   ├── faq.ts
│   │   │   │   ├── contactForm.ts
│   │   │   │   ├── textBlock.ts
│   │   │   │   ├── imageGallery.ts
│   │   │   │   ├── videoEmbed.ts
│   │   │   │   ├── teamGrid.ts
│   │   │   │   ├── statsCounter.ts
│   │   │   │   ├── logoBar.ts
│   │   │   │   ├── seo.ts
│   │   │   │   ├── link.ts
│   │   │   │   └── pageBuilder.ts
│   │   │   └── index.ts         # Schema registry
│   │   ├── lib/
│   │   │   ├── client.ts        # Sanity client + sanityFetch helper
│   │   │   ├── image.ts         # Image URL builder
│   │   │   ├── queries.ts       # GROQ queries (co-located or centralized)
│   │   │   └── isUnique.ts      # Slug uniqueness validator
│   │   ├── studio/
│   │   │   └── logo.tsx         # JDA-branded Studio logo component
│   │   └── sanity.config.ts     # Studio configuration
│   └── lib/
│       ├── utils.ts             # cn() helper, formatDate, etc.
│       ├── jsonLd.ts            # Schema.org JSON-LD generators
│       └── metadata.ts          # Shared metadata helpers
├── public/
│   ├── fonts/                   # Self-hosted fonts (if any)
│   └── images/                  # Static images (logo, favicon)
├── .cursorrules                 # AI development conventions
├── .env.local.example           # Template for env vars
├── tailwind.config.ts           # Design tokens
├── next.config.ts               # Redirects, images, headers
├── tsconfig.json
└── README.md
```

### 1.4 Create .env.local.example

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01
SANITY_API_TOKEN=

# Resend
RESEND_API_KEY=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Revalidation
SANITY_REVALIDATE_SECRET=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 1.5 Create .cursorrules

```markdown
# JDA Catalyst — Cursor Rules

## Project
Next.js 14+ App Router. TypeScript strict mode. Tailwind CSS. Sanity CMS.
All content fetched via GROQ in server components.

## File Structure
- Components: `/src/components/` — PascalCase directories
- Page builder modules: `/src/components/modules/`
- Global components (nav, footer): `/src/components/global/`
- UI primitives (button, container): `/src/components/ui/`
- Sanity schemas: `/src/sanity/schemas/documents/` and `/src/sanity/schemas/objects/`
- GROQ queries: `/src/sanity/lib/queries.ts` or co-located with page
- Utilities: `/src/lib/`

## Components
- One directory per component with `index.tsx` and optional `types.ts`
- Default exports only
- Props interface named `[ComponentName]Props`
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- All images use `SanityImage` component (not next/image directly)

## Sanity Schemas
- Use `defineType`, `defineField`, `defineArrayMember` from `sanity`
- Document types in `/schemas/documents/`, object types in `/schemas/objects/`
- All image fields must include `alt` as a required string field
- All slugs use `isUnique` validator from `@/sanity/lib/isUnique`
- Page builder field: `defineField({ name: 'modules', type: 'pageBuilder' })`

## Data Fetching
- Fetch ONLY in server components using `sanityFetch()` from `@/sanity/lib/client`
- Never fetch in client components — pass data as props
- Use `revalidateTag` for ISR cache invalidation
- GROQ queries use tagged template literals for syntax highlighting

## Styling
- Tailwind utility classes exclusively. No custom CSS files
- Use design tokens from `tailwind.config.ts` — never hardcode colors or spacing
- Responsive: mobile-first (`sm:`, `md:`, `lg:`, `xl:`)
- Dark mode: not implemented by default (add per project if needed)

## TypeScript
- Strict mode. Never use `any`
- Sanity query results typed with manually defined interfaces (add sanity-typegen later)
- Prefer `interface` over `type` for object shapes

## Accessibility
- Semantic HTML elements: nav, main, article, section, aside, header, footer
- All interactive elements keyboard accessible
- ARIA attributes on custom widgets (accordion, carousel, dropdown)
- Skip-to-content link in root layout
- Heading hierarchy enforced by component structure, not editor choice

## Avoid
- Pages Router (use App Router only)
- CSS modules or styled-components
- Fetching in client components
- `use client` unless genuinely needed for interactivity
- Installing packages without checking if functionality exists in current stack
- Hardcoded strings (use Sanity fields or constants)
```

---

## Phase 2: Tailwind Design Tokens

### 2.1 Configure tailwind.config.ts

This is the file that changes per client. Everything else stays the same.

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // === CLIENT BRAND TOKENS (swap these per project) ===
      colors: {
        brand: {
          primary: "#1A1018",    // Primary brand color
          secondary: "#ED1A3B",  // Accent / CTA color
          muted: "#8A7A72",      // Muted text, captions
          background: "#FFFFFF", // Page background
          surface: "#F9F8F7",    // Card/section background
          border: "#D6CFC8",     // Borders, dividers
          text: "#4A3F44",       // Body text
          "text-heading": "#1A1018", // Heading text
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],  // Headings
        body: ["Arial", "sans-serif"],  // Body text
      },
      borderRadius: {
        DEFAULT: "0.375rem",  // Adjust per brand (sharp=0, rounded=0.75rem)
      },
      spacing: {
        section: "5rem",      // Vertical spacing between page sections
        "section-sm": "3rem", // Compact section spacing
      },
      maxWidth: {
        content: "75rem", // 1200px max content width
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Phase 3: Sanity Setup

### 3.1 Initialize Sanity Project

```bash
npx sanity@latest init --env .env.local
```

Select: Create new project → name it → choose dataset "production" → select embedded studio option.

### 3.2 Build Schema — Documents

Work through these in order. Each one is a file in `/src/sanity/schemas/documents/`.

**Priority order:**

1. `globalSettings.ts` — site title, logo, default SEO, social links
2. `page.ts` — title, slug, SEO object, page builder array
3. `blogPost.ts` — title, slug, author, date, excerpt, body (Portable Text), featured image, SEO object
4. `teamMember.ts` — name, title, photo, bio, social links
5. `navigation.ts` — array of link objects (label, url, children array for dropdowns)
6. `footer.ts` — columns of links, social icons, copyright text
7. `formSubmission.ts` — name, email, message, source page, timestamp (read-only for editors)

**For each document type, define:**
- All fields using `defineField()`
- Validation rules (required fields, max lengths, slug uniqueness)
- Preview configuration (what shows in Studio list view)
- Ordering (blogPost by date descending, etc.)

### 3.3 Build Schema — Objects

These are the page builder modules. Each is a file in `/src/sanity/schemas/objects/`.

**Priority order (build the simplest first):**

1. `link.ts` — reusable link object (label, url, isExternal)
2. `seo.ts` — metaTitle (with 60-char validation), metaDescription (160-char), ogImage
3. `textBlock.ts` — single field: body (Portable Text with configured formatting)
4. `hero.ts` — heading, subheading, cta (link object), backgroundImage with hotspot
5. `cta.ts` — heading, body, primaryButton (link), secondaryButton (link), background color option
6. `featureGrid.ts` — heading, array of features (icon, title, description)
7. `imageGallery.ts` — array of images with captions
8. `videoEmbed.ts` — url (YouTube/Vimeo), optional poster image
9. `statsCounter.ts` — array of stats (number, label, optional prefix/suffix)
10. `logoBar.ts` — heading, array of logo images
11. `testimonials.ts` — array of testimonials (quote, name, title, photo)
12. `faq.ts` — heading, array of Q&A pairs (question string, answer Portable Text)
13. `teamGrid.ts` — heading, array of references to teamMember documents
14. `contactForm.ts` — heading, description, recipient email, success message, fields config
15. `pageBuilder.ts` — array accepting all module types above

### 3.4 Schema Registry

`/src/sanity/schemas/index.ts` — import and export all schemas as a flat array. Register in `sanity.config.ts`.

### 3.5 Sanity Client & Helpers

**`/src/sanity/lib/client.ts`:**
- Create Sanity client with project ID, dataset, API version from env
- Create `sanityFetch()` wrapper that adds caching tags for ISR revalidation
- Export both `client` (for mutations) and `sanityFetch` (for queries)

**`/src/sanity/lib/image.ts`:**
- Export `urlFor(source)` using `@sanity/image-url`

**`/src/sanity/lib/queries.ts`:**
- Start with queries for: all pages, single page by slug, all blog posts, single blog post by slug, global settings, navigation, footer
- Each query should project only the fields needed (never `*`)

**`/src/sanity/lib/isUnique.ts`:**
- Slug uniqueness validator for documents with slugs

### 3.6 Studio Configuration

**`/src/sanity/sanity.config.ts`:**
- Configure with project ID and dataset from env
- Register all schemas
- Add Vision plugin (GROQ playground)
- Add Presentation plugin (live preview) pointing at the site URL
- Custom Studio logo component with JDA branding

**`/src/app/studio/[[...tool]]/page.tsx`:**
- Render Sanity Studio using `next-sanity/studio`
- Set metadata to prevent indexing: `robots: { index: false }`

---

## Phase 4: Core Infrastructure

### 4.1 Root Layout (`/src/app/layout.tsx`)

- HTML lang attribute
- Font loading (if using custom fonts via `next/font`)
- Skip-to-content link
- Global metadata defaults (from Sanity globalSettings)
- JSON-LD for Organization schema (rendered on every page)
- Vercel Analytics and Speed Insights components

### 4.2 Site Layout (`/src/app/(site)/layout.tsx`)

- Fetch navigation and footer data from Sanity (server component)
- Render Navigation, `<main id="main-content">`, Footer
- Wrap children in the main tag

### 4.3 Utility: `cn()` helper

```typescript
// /src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 4.4 SanityImage Component

`/src/components/ui/SanityImage/index.tsx`
- Wraps `next/image` with Sanity image URL builder
- Accepts Sanity image object with hotspot/crop data
- Computes `objectPosition` from hotspot for CSS focal point
- Required `alt` prop (enforced by TypeScript, enforced by Sanity schema)

### 4.5 PortableText Component

`/src/components/ui/PortableText/index.tsx`
- Wraps `@portabletext/react` with custom serializers
- Map block types to styled HTML elements
- Map marks (bold, italic, link) to styled elements
- Map custom block types (if any) to React components
- Handle images within Portable Text using SanityImage

### 4.6 PageBuilder Component

`/src/components/PageBuilder.tsx`
- Receives the `modules` array from a Sanity page document
- Maps each module's `_type` to the corresponding React component
- Renders modules in order with consistent section spacing
- Handles unknown types gracefully (logs warning in dev, renders nothing in prod)

```typescript
const moduleMap: Record<string, React.ComponentType<any>> = {
  hero: Hero,
  cta: CTA,
  featureGrid: FeatureGrid,
  // ... all modules
};
```

---

## Phase 5: Page Builder Modules

Build each module component in `/src/components/modules/`. Work through them in this order — each introduces a pattern the next ones build on.

### 5.1 TextBlock
**Why first:** Simplest module. Portable Text rendering. Validates the full pipeline (Sanity → GROQ → component → render).

### 5.2 Hero
**New pattern:** Background image with hotspot, CTA button linking, full-bleed responsive layout.

### 5.3 CTA
**New pattern:** Configurable background color/image, primary + secondary button variants.

### 5.4 FeatureGrid
**New pattern:** Array of items rendered as responsive grid. Column count adapts by breakpoint.

### 5.5 StatsCounter
**New pattern:** Animated number count-up on scroll (requires `use client` + IntersectionObserver). First client component.

### 5.6 LogoBar
**New pattern:** Image array with consistent sizing. Optional grayscale-to-color hover effect.

### 5.7 ImageGallery
**New pattern:** Grid with lightbox interaction. Lazy loading.

### 5.8 VideoEmbed
**New pattern:** YouTube/Vimeo URL parsing, lazy-loaded iframe with facade pattern (thumbnail click to load).

### 5.9 Testimonials
**New pattern:** Carousel/slider or masonry grid (configurable). Requires client-side state for carousel.

### 5.10 FAQ
**New pattern:** Accordion with ARIA attributes (aria-expanded, aria-controls). Keyboard accessible. Generates FAQPage JSON-LD.

### 5.11 TeamGrid
**New pattern:** Sanity references resolved in the GROQ query. Grid with link to detail page or modal.

### 5.12 ContactForm
**New pattern:** Full form pipeline — Turnstile verification, server-side validation in API route, Resend email notification, Sanity document creation for stored submissions. This is the most complex module.

---

## Phase 6: Global Components

### 6.1 Navigation
- Fetch from Sanity navigation document
- Desktop: horizontal links with dropdown submenus
- Mobile: hamburger button → slide-out or full-screen menu
- Keyboard accessible: arrow keys navigate dropdowns, Escape closes
- ARIA: `aria-expanded`, `aria-haspopup`, `aria-controls`
- Active link highlighting based on current route
- Skip-to-content link above navigation

### 6.2 Footer
- Fetch from Sanity footer document
- Responsive columns of links
- Social media icons
- Copyright text with dynamic year
- Optional newsletter signup (reuse form pattern from ContactForm)

---

## Phase 7: Pages & Routing

### 7.1 Homepage (`/src/app/(site)/page.tsx`)
- Fetch homepage document from Sanity (by a known slug or a singleton document type)
- Render SEO metadata via `generateMetadata()`
- Render PageBuilder with the page's modules array
- JSON-LD for WebPage

### 7.2 Dynamic Pages (`/src/app/(site)/[slug]/page.tsx`)
- `generateStaticParams()` fetches all page slugs from Sanity for static generation
- `generateMetadata()` fetches page SEO fields
- Fetch page by slug, render PageBuilder
- Return `notFound()` if slug doesn't match
- JSON-LD for WebPage

### 7.3 Blog Listing (`/src/app/(site)/blog/page.tsx`)
- Fetch all published blog posts, ordered by date descending
- Render as a grid/list with featured image, title, excerpt, date
- Pagination (start with simple load-more or numbered pages)

### 7.4 Blog Post (`/src/app/(site)/blog/[slug]/page.tsx`)
- `generateStaticParams()` for all blog slugs
- `generateMetadata()` from blog post SEO fields
- Render blog post: featured image, title, date, author, body (Portable Text)
- JSON-LD for Article schema

---

## Phase 8: API Routes

### 8.1 Contact Form Handler (`/src/app/api/contact/route.ts`)

```
POST request flow:
1. Parse request body (name, email, message, turnstileToken, sourcePage)
2. Verify Turnstile token server-side against Cloudflare API
3. Validate fields (required, email format, max lengths)
4. Send notification email via Resend
5. Create formSubmission document in Sanity
6. Return success/error JSON response
```

### 8.2 Revalidation Webhook (`/src/app/api/revalidate/route.ts`)

```
POST request flow:
1. Verify secret from request header matches SANITY_REVALIDATE_SECRET
2. Parse Sanity webhook payload to determine which document changed
3. Call revalidateTag() or revalidatePath() for affected pages
4. Return confirmation
```

Configure in Sanity: Settings → API → Webhooks → add webhook pointing at `https://yourdomain.com/api/revalidate` with the secret header.

### 8.3 Turnstile Verification (`/src/app/api/turnstile/route.ts`)

Optional standalone endpoint if you want to verify Turnstile separately from form submission. Can also be inlined in the contact form handler.

---

## Phase 9: SEO & Metadata

### 9.1 Sitemap (`/src/app/sitemap.ts`)
- Fetch all pages and blog posts from Sanity
- Return `MetadataRoute.Sitemap` array with URLs, lastModified dates, priorities
- Vercel serves at `/sitemap.xml` automatically

### 9.2 Robots (`/src/app/robots.ts`)
- Allow all crawlers
- Reference sitemap URL
- Disallow `/studio/`

### 9.3 JSON-LD Generators (`/src/lib/jsonLd.ts`)
- `organizationSchema()` — from globalSettings (name, url, logo, social links)
- `webPageSchema(page)` — URL, title, description, organization reference
- `articleSchema(post)` — headline, author, datePublished, image
- `faqPageSchema(items)` — array of Question/Answer from FAQ module
- `localBusinessSchema(settings)` — address, hours, phone (when applicable)

Each returns a `<script type="application/ld+json">` renderable JSX element.

### 9.4 SEO Fields in Sanity
The `seo.ts` object schema includes:
- `metaTitle` — string, max 60 chars, with character count helper in Studio
- `metaDescription` — text, max 160 chars, with character count helper
- `ogImage` — image field for Open Graph / social sharing
- Optional: Studio preview component showing how the page appears in Google results

### 9.5 Metadata Generation Pattern
Every page uses `generateMetadata()`:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const page = await sanityFetch({ query: pageQuery, params });
  const globalSettings = await sanityFetch({ query: settingsQuery });

  return {
    title: page.seo?.metaTitle || page.title,
    description: page.seo?.metaDescription,
    openGraph: {
      title: page.seo?.metaTitle || page.title,
      description: page.seo?.metaDescription,
      images: page.seo?.ogImage ? [urlFor(page.seo.ogImage).url()] : [],
      url: `${globalSettings.siteUrl}/${page.slug}`,
    },
  };
}
```

---

## Phase 10: Forms Deep Dive

### 10.1 Base Form Component Pattern

```
ContactForm component (client component):
├── State: form values, errors, submitting, success
├── Turnstile widget (renders invisible challenge)
├── Input fields with labels, validation messages, aria-describedby
├── Submit handler:
│   1. Client-side validation
│   2. POST to /api/contact with body + Turnstile token
│   3. Handle success (show confirmation message)
│   4. Handle error (show error, allow retry)
└── Accessible: required fields marked, error announcements via aria-live
```

### 10.2 Resend Integration

```typescript
// In API route
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@jdaworldwide.com',  // Verified sender domain
  to: formConfig.recipientEmail,
  subject: `New contact form submission from ${name}`,
  html: `<p><strong>Name:</strong> ${name}</p>
         <p><strong>Email:</strong> ${email}</p>
         <p><strong>Message:</strong> ${message}</p>`,
});
```

### 10.3 Sanity Form Submission Storage

```typescript
// In API route, after sending email
import { client } from '@/sanity/lib/client';

await client.create({
  _type: 'formSubmission',
  name,
  email,
  message,
  sourcePage: body.sourcePage,
  submittedAt: new Date().toISOString(),
});
```

Editors see submissions in Studio under a "Form Submissions" section. Read-only fields prevent editing submitted data.

---

## Phase 11: Accessibility Checklist

Before considering the template complete, verify:

- [ ] Skip-to-content link is first focusable element
- [ ] All pages have a single `<h1>`
- [ ] Heading levels never skip (h1 → h3 without h2)
- [ ] All images have alt text (enforced by Sanity schema validation)
- [ ] All form inputs have associated labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus is visible on all interactive elements (Tailwind `focus-visible:`)
- [ ] Navigation is usable with keyboard only
- [ ] FAQ accordion uses `aria-expanded` and `aria-controls`
- [ ] Color contrast meets WCAG AA (verify with design tokens)
- [ ] `aria-live` regions announce form errors and success messages
- [ ] No content is conveyed by color alone
- [ ] Lighthouse accessibility score ≥ 95

---

## Phase 12: Deployment & Configuration

### 12.1 Vercel Setup
1. Push to GitHub (JDA org)
2. Import project in Vercel dashboard
3. Framework auto-detected as Next.js
4. Add environment variables (all from `.env.local`)
5. Deploy

### 12.2 Environment Variables in Vercel
- **Production:** Sanity production dataset, live Resend key, production Turnstile keys, production site URL
- **Preview:** Sanity staging dataset (create via `sanity dataset copy production staging`), test Resend key, test Turnstile keys
- **Development:** Handled by local `.env.local`

### 12.3 Sanity Webhook for ISR
In Sanity dashboard:
1. Settings → API → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/revalidate`
3. Add secret header: `x-sanity-secret: <your-secret>`
4. Trigger on: Create, Update, Delete
5. Filter: leave blank (all document types) or filter specific types

### 12.4 Resend Domain Verification
1. Add sending domain in Resend dashboard
2. Add DNS records (DKIM, SPF, DMARC) at client's registrar
3. Verify in Resend
4. Update `from` address in API route

---

## Phase 13: Documentation

### 13.1 README.md
- Project overview and stack description
- Getting started (clone, install, env vars, dev server)
- Sanity Studio access
- Adding new page builder modules (step-by-step)
- Adding new document types
- Deployment to Vercel
- Environment variables reference
- Design token customization guide

### 13.2 New Project Checklist

With the CLI in place, `npm create jda-catalyst my-client` handles the first few steps
automatically. The remaining manual steps:

```markdown
## New Project Setup
- [ ] Run `npm create jda-catalyst my-client` (scaffolds from template, prompts for config)
- [ ] Create new Sanity project: `npx sanity@latest init --env .env.local`
- [ ] Update `sanity.config.ts` with new project ID
- [ ] Create GitHub repo in JDA org, push
- [ ] Connect to Vercel, add env vars
- [ ] Fine-tune Tailwind tokens: colors, fonts, spacing, border-radius
- [ ] Update globalSettings in Sanity: site title, logo, SEO defaults
- [ ] Configure navigation and footer in Sanity
- [ ] Set up Resend sending domain for client
- [ ] Add Sanity webhook for ISR revalidation
- [ ] Create staging dataset: `sanity dataset copy production staging`
- [ ] Verify Turnstile keys for client domain
- [ ] Build client-specific components
- [ ] Launch
```

---

## Phase 14: CLI Scaffolding Tool

> Built after the template is stable. Published as `create-jda-catalyst` on npm.

### 14.1 CLI Package Setup

Create `cli/package.json` with `name: "create-jda-catalyst"` and a `bin` entry.

### 14.2 CLI Behavior

When a user runs `npm create jda-catalyst my-project`:

1. Copy the `template/` directory into `./my-project/`
2. Prompt for: project name, Sanity project ID, primary brand color, site URL
3. Find-and-replace placeholder values across template files
4. Run `npm install`
5. Initialize git repo
6. Print next steps (Sanity init, env vars, deploy checklist)

### 14.3 Publishing

Publish to npm under the JDA org. The CLI is lightweight (~150 lines)
and rarely needs updates — the template is the living product.

---

## Build Order Summary

If you need to prioritize, here's the critical path:

| Priority | What | Why |
|----------|------|-----|
| 1 | Phase 1 (scaffolding) + Phase 2 (tokens) | Foundation |
| 2 | Phase 3.1–3.5 (Sanity schemas + client) | Content model |
| 3 | Phase 4 (core infra: layouts, PageBuilder, SanityImage, PortableText) | Rendering pipeline |
| 4 | Phase 5.1–5.4 (TextBlock, Hero, CTA, FeatureGrid) | Prove the pattern works end-to-end |
| 5 | Phase 7.1–7.2 (Homepage + dynamic pages) | First visible result |
| 6 | Phase 6 (Navigation + Footer) | Complete page experience |
| 7 | Phase 9 (SEO + metadata) | Production readiness |
| 8 | Phase 5.5–5.12 (remaining modules) | Complete the library |
| 9 | Phase 8 + 10 (forms, Resend, Turnstile) | Interactive features |
| 10 | Phase 11–13 (a11y audit, deploy config, docs) | Polish and ship |
| 11 | Phase 14 (CLI scaffolding tool) | Distribution and DX |

At priority 5 you will have a working site with content from Sanity rendering through the page builder. Everything after that is expanding capabilities.
