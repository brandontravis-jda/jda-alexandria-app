import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityFetch } from "@/sanity/lib/client";
import { blogPostBySlugQuery, allBlogPostsQuery, settingsQuery } from "@/sanity/lib/queries";
import { urlFor } from "@/sanity/lib/image";
import { formatDate } from "@/lib/utils";
import { buildMetadata } from "@/lib/metadata";
import { JsonLd, articleSchema } from "@/lib/jsonLd";
import PortableText from "@/components/ui/PortableText";
import SanityImage from "@/components/ui/SanityImage";

import type { SanityImageSource } from "@/components/ui/SanityImage/types";

interface BlogPost {
  title: string;
  slug: string;
  author?: string;
  publishedAt: string;
  excerpt?: string;
  body?: unknown[];
  featuredImage?: SanityImageSource;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: { asset: { _ref: string } };
  };
}

interface GlobalSettings {
  siteTitle?: string;
  siteUrl?: string;
}

export async function generateStaticParams() {
  const posts = await sanityFetch<{ slug: string }[]>({
    query: allBlogPostsQuery,
    tags: ["blogPost"],
  });

  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    sanityFetch<BlogPost | null>({ query: blogPostBySlugQuery, params: { slug }, tags: ["blogPost"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!post) return {};

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return buildMetadata(
    { title: post.title, slug: `blog/${post.slug}`, seo: post.seo },
    siteUrl
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    sanityFetch<BlogPost | null>({ query: blogPostBySlugQuery, params: { slug }, tags: ["blogPost"] }),
    sanityFetch<GlobalSettings | null>({ query: settingsQuery, tags: ["globalSettings"] }),
  ]);

  if (!post) notFound();

  const siteUrl = settings?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return (
    <article className="mx-auto max-w-3xl px-4 py-section">
      <JsonLd
        data={articleSchema({
          headline: post.title,
          description: post.seo?.metaDescription || post.excerpt,
          url: `${siteUrl}/blog/${post.slug}`,
          image: post.featuredImage?.asset
            ? urlFor(post.featuredImage).width(1200).height(630).url()
            : undefined,
          author: post.author,
          datePublished: post.publishedAt,
        })}
      />
      <header className="mb-12">
        <h1 className="font-display text-4xl font-bold lg:text-5xl">
          {post.title}
        </h1>
        <div className="mt-4 flex items-center gap-4 text-brand-muted">
          {post.author && <span>{post.author}</span>}
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </div>
      </header>
      {post.featuredImage?.asset && (
        <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-lg">
          <SanityImage
            image={post.featuredImage}
            width={1200}
            height={675}
            sizes="(max-width: 768px) 100vw, 48rem"
            priority
            className="rounded-lg"
          />
        </div>
      )}
      {post.body && <PortableText value={post.body} />}
    </article>
  );
}
