import Link from "next/link";
import { notFound } from "next/navigation";
import EditInStudioLink from "@/components/portal/EditInStudioLink";
import PortalPanel from "@/components/portal/PortalPanel";
import { sanityFetch } from "@/sanity/lib/client";
import { brandPackageBySlugQuery } from "@/sanity/lib/queries";

interface ColorSwatch {
  colorName?: string;
  hex?: string;
  role?: string;
  usageNotes?: string;
}

interface BrandDoc {
  _id: string;
  clientName: string;
  slug: string;
  abbreviations?: string;
  extractedDate?: string;
  sourceDocument?: string;
  extractedBy?: string;
  gaps?: string;
  logoUsageRules?: string;
  templateOverrides?: string;
  identity?: {
    tagline?: string;
    brandPersonality?: string;
    brandVoice?: string;
    brandExperience?: string;
  };
  colorPalette?: ColorSwatch[];
  colorUsageRules?: string;
  typography?: {
    headingFont?: string;
    bodyFont?: string;
    accentFont?: string;
    pairingRules?: string;
  };
  rawMarkdown?: string;
}

export default async function ClientBrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await sanityFetch<BrandDoc | null>({
    query: brandPackageBySlugQuery,
    params: { slug },
  });

  if (!doc) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="text-xs font-semibold no-underline mb-2 inline-block"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
          >
            ← Clients
          </Link>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            {doc.clientName}
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--color-jda-warm-gray)" }}>
            {[doc.abbreviations, doc.sourceDocument].filter(Boolean).join(" · ")}
            {doc.extractedDate ? ` · Extracted ${doc.extractedDate}` : ""}
            {doc.extractedBy ? ` · By ${doc.extractedBy}` : ""}
          </p>
        </div>
        <EditInStudioLink documentId={doc._id} schemaType="clientBrandPackage" />
      </div>

      <div className="flex flex-col gap-5">
        {doc.identity && Object.values(doc.identity).some(Boolean) ? (
          <PortalPanel title="Identity">
            <dl className="grid gap-3 text-sm sm:grid-cols-2" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.identity.tagline ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Tagline
                  </dt>
                  <dd>{doc.identity.tagline}</dd>
                </>
              ) : null}
              {doc.identity.brandVoice ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Voice
                  </dt>
                  <dd>{doc.identity.brandVoice}</dd>
                </>
              ) : null}
              {doc.identity.brandPersonality ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Personality
                  </dt>
                  <dd>{doc.identity.brandPersonality}</dd>
                </>
              ) : null}
              {doc.identity.brandExperience ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Experience
                  </dt>
                  <dd>{doc.identity.brandExperience}</dd>
                </>
              ) : null}
            </dl>
          </PortalPanel>
        ) : null}

        {doc.colorPalette && doc.colorPalette.length > 0 ? (
          <PortalPanel title="Color palette">
            <ul className="space-y-2 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.colorPalette.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  {c.hex ? (
                    <span
                      className="inline-block w-6 h-6 rounded border flex-shrink-0"
                      style={{ background: c.hex, borderColor: "var(--color-jda-border)" }}
                      title={c.hex}
                    />
                  ) : null}
                  <span className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    {c.colorName}
                  </span>
                  {c.hex ? <span className="opacity-80">{c.hex}</span> : null}
                  {c.role ? <span className="text-xs uppercase tracking-wide">{c.role}</span> : null}
                  {c.usageNotes ? <span className="w-full text-xs">{c.usageNotes}</span> : null}
                </li>
              ))}
            </ul>
            {doc.colorUsageRules ? (
              <p className="text-sm mt-4 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
                {doc.colorUsageRules}
              </p>
            ) : null}
          </PortalPanel>
        ) : null}

        {doc.typography && Object.values(doc.typography).some(Boolean) ? (
          <PortalPanel title="Typography">
            <dl className="grid gap-3 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.typography.headingFont ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Headings
                  </dt>
                  <dd>{doc.typography.headingFont}</dd>
                </>
              ) : null}
              {doc.typography.bodyFont ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Body
                  </dt>
                  <dd>{doc.typography.bodyFont}</dd>
                </>
              ) : null}
              {doc.typography.accentFont ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Accent
                  </dt>
                  <dd>{doc.typography.accentFont}</dd>
                </>
              ) : null}
              {doc.typography.pairingRules ? (
                <>
                  <dt className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    Pairing
                  </dt>
                  <dd className="whitespace-pre-wrap">{doc.typography.pairingRules}</dd>
                </>
              ) : null}
            </dl>
          </PortalPanel>
        ) : null}

        {doc.logoUsageRules ? (
          <PortalPanel title="Logo usage">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.logoUsageRules}
            </p>
          </PortalPanel>
        ) : null}

        {doc.templateOverrides ? (
          <PortalPanel title="Template overrides">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.templateOverrides}
            </p>
          </PortalPanel>
        ) : null}

        {doc.gaps ? (
          <PortalPanel title="Extraction gaps">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-amber)" }}>
              {doc.gaps}
            </p>
          </PortalPanel>
        ) : null}

        {doc.rawMarkdown ? (
          <PortalPanel title="Full brand package (markdown)">
            <p className="text-xs mb-2" style={{ color: "var(--color-jda-warm-gray)" }}>
              As served to Claude for rich context. Scroll to review; edit in Studio.
            </p>
            <pre
              className="text-xs leading-relaxed p-4 rounded-lg overflow-auto max-h-[min(70vh,560px)] border whitespace-pre-wrap"
              style={{
                background: "var(--color-jda-bg)",
                borderColor: "var(--color-jda-border)",
                color: "var(--color-jda-cream-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {doc.rawMarkdown}
            </pre>
          </PortalPanel>
        ) : null}
      </div>
    </div>
  );
}
