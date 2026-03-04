import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/client";
import { allBlogPostsQuery } from "@/sanity/lib/queries";
import { formatDate } from "@/lib/utils";
import SanityImage from "@/components/ui/SanityImage";

export const metadata: Metadata = {
  title: "Blog",
};

import type { SanityImageSource } from "@/components/ui/SanityImage/types";

interface BlogPostPreview {
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt: string;
  featuredImage?: SanityImageSource;
}

export default async function BlogListingPage() {
  const posts = await sanityFetch<BlogPostPreview[]>({
    query: allBlogPostsQuery,
    tags: ["blogPost"],
  });

  return (
    <section className="mx-auto max-w-[var(--container-content)] px-4 py-section">
      <h1 className="mb-12 font-display text-4xl font-bold">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-brand-muted">No posts yet.</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.slug}>
              <a href={`/blog/${post.slug}`} className="group block">
                {post.featuredImage?.asset && (
                  <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded">
                    <SanityImage
                      image={post.featuredImage}
                      width={600}
                      height={338}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <h2 className="font-display text-xl font-semibold group-hover:text-brand-secondary">
                  {post.title}
                </h2>
                <time dateTime={post.publishedAt} className="mt-1 block text-sm text-brand-muted">
                  {formatDate(post.publishedAt)}
                </time>
                {post.excerpt && (
                  <p className="mt-2 text-brand-text">{post.excerpt}</p>
                )}
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
