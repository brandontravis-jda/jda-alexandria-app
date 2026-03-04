import type { Metadata } from "next";
import { urlFor } from "@/sanity/lib/image";

interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: { asset: { _ref: string } };
}

interface PageMeta {
  title: string;
  slug?: string;
  seo?: SeoFields;
}

export function buildMetadata(
  page: PageMeta,
  siteUrl: string
): Metadata {
  const title = page.seo?.metaTitle || page.title;
  const description = page.seo?.metaDescription;
  const url = page.slug
    ? page.slug === "home"
      ? siteUrl
      : `${siteUrl}/${page.slug}`
    : siteUrl;

  const ogImage = page.seo?.ogImage?.asset
    ? urlFor(page.seo.ogImage).width(1200).height(630).url()
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description: description || undefined,
      url,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description: description || undefined,
    },
  };
}
