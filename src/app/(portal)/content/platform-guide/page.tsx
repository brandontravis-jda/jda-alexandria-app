import Link from "next/link";
import EditInStudioLink from "@/components/portal/EditInStudioLink";
import PortalPanel from "@/components/portal/PortalPanel";
import { sanityFetch } from "@/sanity/lib/client";
import { platformGuideBrowseQuery } from "@/sanity/lib/queries";

interface CanonicalEntry {
  label?: string;
  prompt?: string;
}

interface ExamplePrompt {
  useCase?: string;
  prompt?: string;
}

interface PlatformGuideDoc {
  _id: string;
  platformIntro?: string;
  canonicalEntryPrompts?: CanonicalEntry[];
  examplePrompts?: ExamplePrompt[];
  feedbackPrompt?: string;
}

export default async function PlatformGuidePage() {
  const doc = await sanityFetch<PlatformGuideDoc | null>({ query: platformGuideBrowseQuery });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/content"
            className="text-xs font-semibold no-underline mb-2 inline-block"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
          >
            ← Content library
          </Link>
          <h1
            className="text-3xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            Platform guide
          </h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--color-jda-warm-gray)" }}>
            Copy surfaced to practitioners via <code className="text-xs">alexandria_help</code> and related MCP flows.
          </p>
        </div>
        {doc ? <EditInStudioLink documentId={doc._id} schemaType="platformGuide" /> : null}
      </div>

      {!doc ? (
        <PortalPanel title="Not found">
          <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
            No platform guide document exists in this dataset yet. Create it in Sanity Studio (singleton).
          </p>
        </PortalPanel>
      ) : (
        <div className="flex flex-col gap-5">
          {doc.platformIntro ? (
            <PortalPanel title="Platform introduction">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
                {doc.platformIntro}
              </p>
            </PortalPanel>
          ) : null}

          {doc.canonicalEntryPrompts && doc.canonicalEntryPrompts.length > 0 ? (
            <PortalPanel title="Canonical entry prompts">
              <ul className="space-y-4 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
                {doc.canonicalEntryPrompts.map((c, i) => (
                  <li key={i}>
                    <div className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                      {c.label}
                    </div>
                    {c.prompt ? (
                      <pre
                        className="mt-2 text-xs p-3 rounded-lg border whitespace-pre-wrap"
                        style={{
                          background: "var(--color-jda-bg)",
                          borderColor: "var(--color-jda-border)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {c.prompt}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            </PortalPanel>
          ) : null}

          {doc.examplePrompts && doc.examplePrompts.length > 0 ? (
            <PortalPanel title="Example prompts">
              <ul className="space-y-4 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
                {doc.examplePrompts.map((e, i) => (
                  <li key={i}>
                    <div className="font-semibold" style={{ color: "var(--color-jda-cream)" }}>
                      {e.useCase}
                    </div>
                    {e.prompt ? <p className="mt-2 whitespace-pre-wrap leading-relaxed">{e.prompt}</p> : null}
                  </li>
                ))}
              </ul>
            </PortalPanel>
          ) : null}

          {doc.feedbackPrompt ? (
            <PortalPanel title="Feedback prompt (rate this tool)">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-jda-cream-muted)" }}>
                {doc.feedbackPrompt}
              </p>
            </PortalPanel>
          ) : null}
        </div>
      )}
    </div>
  );
}
