export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface OrganizationInput {
  name: string;
  url: string;
  logo?: string;
  socialLinks?: string[];
}

interface WebPageInput {
  title: string;
  description?: string;
  url: string;
  organizationName?: string;
}

interface ArticleInput {
  headline: string;
  description?: string;
  url: string;
  image?: string;
  author?: string;
  datePublished: string;
  dateModified?: string;
}

interface FAQInput {
  question: string;
  answer: string;
}

export function organizationSchema(input: OrganizationInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    ...(input.logo && { logo: input.logo }),
    ...(input.socialLinks?.length && { sameAs: input.socialLinks }),
  };
}

export function webPageSchema(input: WebPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    ...(input.description && { description: input.description }),
    url: input.url,
    ...(input.organizationName && {
      isPartOf: {
        "@type": "WebSite",
        name: input.organizationName,
      },
    }),
  };
}

export function articleSchema(input: ArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    ...(input.description && { description: input.description }),
    url: input.url,
    ...(input.image && { image: input.image }),
    ...(input.author && {
      author: {
        "@type": "Person",
        name: input.author,
      },
    }),
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
  };
}

export function faqPageSchema(items: FAQInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function localBusinessSchema(input: {
  name: string;
  url: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
    ...(input.phone && { telephone: input.phone }),
    ...(input.email && { email: input.email }),
    ...(input.address && {
      address: {
        "@type": "PostalAddress",
        ...(input.address.street && { streetAddress: input.address.street }),
        ...(input.address.city && { addressLocality: input.address.city }),
        ...(input.address.state && { addressRegion: input.address.state }),
        ...(input.address.zip && { postalCode: input.address.zip }),
        ...(input.address.country && { addressCountry: input.address.country }),
      },
    }),
  };
}
