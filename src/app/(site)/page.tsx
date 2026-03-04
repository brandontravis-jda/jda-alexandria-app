import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/client";
import { homepageQuery, settingsQuery } from "@/sanity/lib/queries";
import { buildMetadata } from "@/lib/metadata";
import { JsonLd, webPageSchema } from "@/lib/jsonLd";
import PageBuilder from "@/components/PageBuilder";

interface PageData {
  title: string;
  slug: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { asset: { _ref: string } };
  };
  modules?: Array<{ _type: string; _key: string; [key: string]: unknown }>;
}

interface GlobalSettings {
  siteTitle?: string;
  siteUrl?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    sanityFetch<PageData | null>({ query: homepageQuery, tags: ["page"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!page) return { title: "Home" };

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return buildMetadata(page, siteUrl);
}

export default async function HomePage() {
  const [page, settings] = await Promise.all([
    sanityFetch<PageData | null>({ query: homepageQuery, tags: ["page"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!page) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold">JDA Catalyst</h1>
          <p className="mt-4 text-brand-muted">
            Create a page with slug &quot;home&quot; in Sanity Studio to get started.
          </p>
        </div>
      </section>
    );
  }

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <>
      <JsonLd
        data={webPageSchema({
          title: page.seo?.metaTitle || page.title,
          description: page.seo?.metaDescription,
          url: siteUrl,
          organizationName: settings?.siteTitle,
        })}
      />
      <h1 className="sr-only">{page.title}</h1>
      <PageBuilder modules={page.modules} />
    </>
  );
}
