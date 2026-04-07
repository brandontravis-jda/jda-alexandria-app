import Link from "next/link";
import { notFound } from "next/navigation";
import EditInStudioLink from "@/components/portal/EditInStudioLink";
import PortalPanel from "@/components/portal/PortalPanel";
import { methodologyClassLabel } from "@/lib/portal-labels";
import { sanityFetch } from "@/sanity/lib/client";
import { methodologyBySlugQuery } from "@/sanity/lib/queries";

interface Step {
  name?: string;
  instructions?: string;
}

interface QualityCheck {
  name?: string;
  description?: string;
}

interface MethodologyDoc {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  practice?: { name?: string; slug?: string } | null;
  aiClassification?: string;
  outputFormat?: string;
  steps?: Step[];
  qualityChecks?: QualityCheck[];
  systemInstructions?: string;
  failureModes?: { name?: string; description?: string }[];
  tips?: string;
  version?: string;
  author?: string;
}

export default async function MethodologyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await sanityFetch<MethodologyDoc | null>({
    query: methodologyBySlugQuery,
    params: { slug },
  });

  if (!doc) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/content/methodologies"
            className="text-xs font-semibold no-underline mb-2 inline-block"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
          >
            ← Methodologies
          </Link>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            {doc.name}
          </h1>
          <p className="text-sm mt-2 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
            {doc.practice?.name ?? "Agency-wide"} · {methodologyClassLabel(doc.aiClassification)}
            {doc.version ? ` · v${doc.version}` : ""}
            {doc.author ? ` · ${doc.author}` : ""}
          </p>
        </div>
        <EditInStudioLink documentId={doc._id} schemaType="productionMethodology" />
      </div>

      <div className="flex flex-col gap-5">
        {doc.description ? (
          <PortalPanel title="Description">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.description}
            </p>
          </PortalPanel>
        ) : null}

        {doc.outputFormat ? (
          <PortalPanel title="Output format">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.outputFormat}
            </p>
          </PortalPanel>
        ) : null}

        {doc.steps && doc.steps.length > 0 ? (
          <PortalPanel title={`Steps (${doc.steps.length})`}>
            <ol className="list-decimal pl-5 space-y-4 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.steps.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    {s.name}
                  </span>
                  {s.instructions ? (
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed">{s.instructions}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </PortalPanel>
        ) : null}

        {doc.qualityChecks && doc.qualityChecks.length > 0 ? (
          <PortalPanel title="Quality checks">
            <ul className="space-y-3 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.qualityChecks.map((q, i) => (
                <li key={i}>
                  <span className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    {q.name}
                  </span>
                  {q.description ? <p className="mt-1 leading-relaxed">{q.description}</p> : null}
                </li>
              ))}
            </ul>
          </PortalPanel>
        ) : null}

        {doc.failureModes && doc.failureModes.length > 0 ? (
          <PortalPanel title="Failure modes">
            <ul className="space-y-3 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.failureModes.map((f, i) => (
                <li key={i}>
                  <span className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                    {f.name}
                  </span>
                  {f.description ? <p className="mt-1 leading-relaxed">{f.description}</p> : null}
                </li>
              ))}
            </ul>
          </PortalPanel>
        ) : null}

        {doc.tips ? (
          <PortalPanel title="Tips">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
              {doc.tips}
            </p>
          </PortalPanel>
        ) : null}

        {doc.systemInstructions ? (
          <PortalPanel title="System instructions">
            <p className="text-xs mb-2" style={{ color: "var(--color-jda-warm-gray)" }}>
              Full instructions Claude uses for this methodology (admin visibility).
            </p>
            <pre
              className="text-xs leading-relaxed p-4 rounded-lg overflow-x-auto whitespace-pre-wrap border"
              style={{
                background: "var(--color-jda-bg)",
                borderColor: "var(--color-jda-border)",
                color: "var(--color-jda-cream-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              {doc.systemInstructions}
            </pre>
          </PortalPanel>
        ) : null}
      </div>
    </div>
  );
}
