import Link from "next/link";
import { notFound } from "next/navigation";
import EditInStudioLink from "@/components/portal/EditInStudioLink";
import PortalPanel from "@/components/portal/PortalPanel";
import { templateFormatLabel, templateStatusLabel } from "@/lib/portal-labels";
import { sanityFetch } from "@/sanity/lib/client";
import { templateBySlugQuery } from "@/sanity/lib/queries";

interface TemplateDoc {
  _id: string;
  title: string;
  slug: string;
  formatType?: string;
  status?: string;
  previewUrl?: string;
  githubRawUrl?: string;
  dropboxLink?: string;
  useCases?: string;
  featureList?: string;
  fixedElements?: string;
  variableElements?: string;
  brandInjectionRules?: string;
  clientAdaptationNotes?: string;
  outputSpec?: string;
  qualityChecks?: string;
  includeFeedbackPrompt?: boolean;
}

function TextBlock({ children, title }: { title: string; children: string }) {
  return (
    <PortalPanel title={title}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
        {children}
      </p>
    </PortalPanel>
  );
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await sanityFetch<TemplateDoc | null>({
    query: templateBySlugQuery,
    params: { slug },
  });

  if (!doc) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/content/templates"
            className="text-xs font-semibold no-underline mb-2 inline-block"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
          >
            ← Templates
          </Link>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            {doc.title}
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--color-jda-warm-gray)" }}>
            {templateFormatLabel(doc.formatType)} · {templateStatusLabel(doc.status)}
            {doc.includeFeedbackPrompt ? " · Feedback prompt enabled" : ""}
          </p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            {doc.previewUrl ? (
              <a
                href={doc.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: "var(--color-jda-red)" }}
              >
                Preview URL ↗
              </a>
            ) : null}
            {doc.githubRawUrl ? (
              <a
                href={doc.githubRawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: "var(--color-jda-red)" }}
              >
                GitHub raw ↗
              </a>
            ) : null}
            {doc.dropboxLink ? (
              <a
                href={doc.dropboxLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: "var(--color-jda-red)" }}
              >
                Dropbox ↗
              </a>
            ) : null}
          </div>
        </div>
        <EditInStudioLink documentId={doc._id} schemaType="template" />
      </div>

      <div className="flex flex-col gap-5">
        {doc.useCases ? <TextBlock title="Use cases">{doc.useCases}</TextBlock> : null}
        {doc.featureList ? <TextBlock title="Feature list">{doc.featureList}</TextBlock> : null}
        {doc.fixedElements ? <TextBlock title="Fixed elements">{doc.fixedElements}</TextBlock> : null}
        {doc.variableElements ? <TextBlock title="Variable elements">{doc.variableElements}</TextBlock> : null}
        {doc.brandInjectionRules ? <TextBlock title="Brand injection rules">{doc.brandInjectionRules}</TextBlock> : null}
        {doc.clientAdaptationNotes ? <TextBlock title="Client adaptation notes">{doc.clientAdaptationNotes}</TextBlock> : null}
        {doc.outputSpec ? <TextBlock title="Output specification">{doc.outputSpec}</TextBlock> : null}
        {doc.qualityChecks ? <TextBlock title="Quality checks">{doc.qualityChecks}</TextBlock> : null}
      </div>
    </div>
  );
}
