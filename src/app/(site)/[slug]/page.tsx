import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/client";
import { pageBySlugQuery, allPagesQuery, settingsQuery } from "@/sanity/lib/queries";
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

export async function generateStaticParams() {
  const pages = await sanityFetch<{ slug: string }[]>({
    query: allPagesQuery,
    tags: ["page"],
  });

  return pages
    .filter((p) => p.slug && p.slug !== "home")
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([
    sanityFetch<PageData | null>({ query: pageBySlugQuery, params: { slug }, tags: ["page"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!page) return {};

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return buildMetadata(page, siteUrl);
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [page, settings] = await Promise.all([
    sanityFetch<PageData | null>({ query: pageBySlugQuery, params: { slug }, tags: ["page"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!page) notFound();

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <>
      <JsonLd
        data={webPageSchema({
          title: page.seo?.metaTitle || page.title,
          description: page.seo?.metaDescription,
          url: `${siteUrl}/${page.slug}`,
          organizationName: settings?.siteTitle,
        })}
      />
      <h1 className="sr-only">{page.title}</h1>
      <PageBuilder modules={page.modules} />
    </>
  );
}
