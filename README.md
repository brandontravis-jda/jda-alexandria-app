# JDA Catalyst — Next.js + Sanity Starter

A modern, accessible starter template for JDA client projects. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Sanity CMS.

> **Setting up a new client project?** See [SETUP.md](./SETUP.md) for the full step-by-step guide.

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 with design tokens
- **CMS:** Sanity (embedded Studio at `/studio`, Presentation live preview)
- **Forms:** Resend (email) + Cloudflare Turnstile (bot protection)
- **SEO:** JSON-LD (Organization, WebPage, Article, FAQPage), Open Graph, sitemap, robots.txt
- **Analytics:** Vercel Analytics + Speed Insights
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Sanity account ([sanity.io](https://sanity.io))

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Fill in your Sanity project ID, dataset, and API token in .env.local

# Seed demo content (optional — populates Sanity with sample pages, navigation, blog post, and placeholder images)
npm run seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the site and [http://localhost:3000/studio](http://localhost:3000/studio) for Sanity Studio.

### Initialize Sanity

If starting a new Sanity project:

```bash
npx sanity@latest init --env .env.local
```

## Project Structure

```
src/
├── app/
│   ├── (site)/              # Public routes (grouped with shared layout)
│   │   ├── page.tsx         # Homepage
│   │   ├── [slug]/          # Dynamic pages
│   │   └── blog/            # Blog listing + posts
│   ├── studio/              # Embedded Sanity Studio
│   ├── api/                 # API routes (contact, draft-mode, revalidate, turnstile)
│   ├── layout.tsx           # Root layout (skip link, metadata)
│   ├── sitemap.ts           # Dynamic sitemap
│   └── robots.ts            # Robots.txt
├── components/
│   ├── modules/             # Page builder modules (12 total)
│   ├── global/              # Navigation, Footer, SkipLink
│   ├── ui/                  # Button, Container, SanityImage, PortableText
│   └── PageBuilder.tsx      # Module resolver/renderer
├── sanity/
│   ├── schemas/             # Document + object type definitions
│   ├── lib/                 # Client, queries, resolve, structure
│   ├── studio/
│   │   ├── logo.tsx         # Custom Studio logo component
│   │   └── WelcomeWidget.tsx # Dashboard overview widget
│   └── sanity.config.ts     # Studio configuration
└── lib/
    ├── utils.ts             # cn() helper, formatDate
    ├── jsonLd.tsx           # Schema.org JSON-LD generators + renderer
    └── metadata.ts          # Shared metadata builder
```

## Page Builder Modules

All modules are managed in Sanity and rendered via the `PageBuilder` component:

| Module | Description |
|--------|-------------|
| Hero | Full-bleed with background image, heading, CTA |
| TextBlock | Rich text via Portable Text |
| CTA | Call to action with configurable background |
| FeatureGrid | Responsive grid of features with icons |
| StatsCounter | Animated number count-up on scroll |
| LogoBar | Client/partner logos with hover effect |
| ImageGallery | Responsive image grid with lightbox |
| VideoEmbed | YouTube/Vimeo with facade pattern |
| Testimonials | Quote cards — grid or carousel layout |
| FAQ | Accessible accordion with FAQPage JSON-LD |
| TeamGrid | Team member grid from Sanity references |
| ContactForm | Full form with validation, Resend, Turnstile |

## Design Tokens

Brand colors, fonts, spacing, and other tokens are defined in `src/app/globals.css` using Tailwind v4's `@theme` directive. This is the primary file to customize per client:

```css
@theme inline {
  --color-brand-primary: #1A1018;
  --color-brand-secondary: #ED1A3B;
  --font-display: Georgia, serif;
  --font-body: Arial, sans-serif;
  /* ... */
}
```

## Adding a New Page Builder Module

1. Create the Sanity object schema in `src/sanity/schemas/objects/yourModule.ts`
2. Add it to `src/sanity/schemas/objects/pageBuilder.ts`
3. Register it in `src/sanity/schemas/index.ts`
4. Create the component in `src/components/modules/YourModule/` with `index.tsx` and `types.ts`
5. Import and add to the `moduleMap` in `src/components/PageBuilder.tsx`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset (usually `production`) |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Sanity API version |
| `SANITY_API_TOKEN` | Sanity editor token (form submissions + Presentation visual editing) |
| `RESEND_API_KEY` | Resend API key for email |
| `CONTACT_FORM_SENDER` | Sender address for contact emails (must match verified domain) |
| `CONTACT_FORM_RECIPIENT` | Default recipient for contact form submissions |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `SANITY_REVALIDATE_SECRET` | Secret for Sanity webhook ISR |
| `NEXT_PUBLIC_SITE_URL` | Production site URL |

## Deployment

See [SETUP.md](./SETUP.md) for detailed, step-by-step deployment and configuration instructions. The short version:

1. Push to GitHub
2. Import in Vercel — framework auto-detected as Next.js
3. Add all environment variables (see table above, plus per-environment values in SETUP.md)
4. Set up Sanity webhook for ISR: `https://yourdomain.com/api/revalidate` with `x-sanity-secret` header
5. Verify Resend sending domain (DNS records)
6. Add client hostname to shared Turnstile widget

## Accessibility

Built to WCAG AA standards:
- Skip-to-content link
- Semantic HTML landmarks
- Keyboard-navigable menus and accordions
- ARIA attributes on all interactive widgets
- Form labels, error announcements, and `aria-live` regions
- Focus-visible styles throughout
