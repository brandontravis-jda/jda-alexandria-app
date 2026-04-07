import Link from "next/link";
import PortalPanel from "@/components/portal/PortalPanel";
import BrowseListRow from "@/components/portal/BrowseListRow";
import { sanityFetch } from "@/sanity/lib/client";
import {
  allMethodologiesQuery,
  allTemplatesQuery,
  allBrandPackagesQuery,
  allDeliverablesQuery,
} from "@/sanity/lib/queries";

export default async function ContentHubPage() {
  const [methodologies, templates, brands, deliverables] = await Promise.all([
    sanityFetch<Array<{ name: string; slug: string; practice?: string | null }>>({
      query: allMethodologiesQuery,
    }),
    sanityFetch<Array<{ title: string; slug: string; status?: string }>>({ query: allTemplatesQuery }),
    sanityFetch<Array<{ clientName: string; slug: string }>>({ query: allBrandPackagesQuery }),
    sanityFetch<Array<{ name: string; slug: string }>>({ query: allDeliverablesQuery }),
  ]);

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Content library
        </h1>
        <p className="text-sm mt-1 font-normal max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
          Browse everything Alexandria serves through MCP. Authoring and edits happen in{" "}
          <Link href="/studio" className="underline" style={{ color: "var(--color-jda-red)" }}>
            Sanity Studio
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 mb-7">
        <PortalPanel title="Browse by type">
          <div className="flex flex-col gap-0">
            <BrowseListRow
              href="/content/methodologies"
              title="Production methodologies"
              subtitle="Step-by-step production workflows"
              right={`${methodologies.length}`}
            />
            <BrowseListRow
              href="/content/templates"
              title="Templates"
              subtitle="HTML, Word, and email production templates"
              right={`${templates.length}`}
            />
            <BrowseListRow
              href="/clients"
              title="Client brand packages"
              subtitle="Voice, color, typography, and markdown context"
              right={`${brands.length}`}
            />
            <BrowseListRow
              href="/content/deliverables"
              title="Deliverable classifications"
              subtitle="Taxonomy aligned to the capabilities matrix"
              right={`${deliverables.length}`}
            />
            <BrowseListRow
              href="/content/platform-guide"
              title="Platform guide"
              subtitle="Intro copy, entry prompts, and feedback text for practitioners"
              right="1"
            />
          </div>
        </PortalPanel>

        <PortalPanel
          title="Related in portal"
          action={
            <Link
              href="/capabilities"
              className="text-xs font-semibold no-underline"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-jda-red)",
              }}
            >
              Open capabilities
            </Link>
          }
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-jda-cream-muted)" }}>
            The capabilities matrix tracks deliverable types, AI classification, and methodology linkage. It complements
            the content types listed here — use both when planning what Alexandria should cover next.
          </p>
        </PortalPanel>
      </div>
    </div>
  );
}
