import Link from "next/link";
import BrowseListRow from "@/components/portal/BrowseListRow";
import PortalPanel from "@/components/portal/PortalPanel";
import { studioEditDocumentHref } from "@/lib/studio-href";
import { methodologyClassLabel } from "@/lib/portal-labels";
import { sanityFetch } from "@/sanity/lib/client";
import { allDeliverablesQuery } from "@/sanity/lib/queries";

interface Row {
  _id: string;
  name: string;
  slug: string;
  practiceArea?: string;
  aiClassification?: string;
}

export default async function DeliverablesListPage() {
  const rows = await sanityFetch<Row[]>({ query: allDeliverablesQuery });

  return (
    <div>
      <div className="mb-7">
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
          Deliverable classifications
        </h1>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
          Sanity taxonomy used alongside the capabilities matrix. Edit documents in Studio; matrix rows in Postgres remain
          the operational view at{" "}
          <Link href="/capabilities" className="underline" style={{ color: "var(--color-jda-red)" }}>
            /capabilities
          </Link>
          .
        </p>
      </div>

      <PortalPanel title="All classifications">
        <div className="flex flex-col gap-0">
          {rows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
              No deliverable classifications found.
            </p>
          ) : (
            rows.map((r) => (
              <BrowseListRow
                key={r._id}
                href={studioEditDocumentHref(r._id, "deliverableClassification")}
                title={r.name}
                subtitle={[r.practiceArea ?? "—", methodologyClassLabel(r.aiClassification)].join(" · ")}
                right="Studio ↗"
              />
            ))
          )}
        </div>
      </PortalPanel>
    </div>
  );
}
