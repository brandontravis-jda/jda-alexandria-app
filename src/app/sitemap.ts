import type { MetadataRoute } from "next";
import { sanityFetch } from "@/sanity/lib/client";
import { allPagesQuery, allBlogPostsQuery } from "@/sanity/lib/queries";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts] = await Promise.all([
    sanityFetch<{ slug: string }[]>({ query: allPagesQuery }),
    sanityFetch<{ slug: string; publishedAt: string }[]>({
      query: allBlogPostsQuery,
    }),
  ]);

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: page.slug === "home" ? siteUrl : `${siteUrl}/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: page.slug === "home" ? 1 : 0.8,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...pageEntries,
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...postEntries,
  ];
}
