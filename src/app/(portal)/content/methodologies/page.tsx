import BrowseListRow from "@/components/portal/BrowseListRow";
import PortalPanel from "@/components/portal/PortalPanel";
import { sanityFetch } from "@/sanity/lib/client";
import { allMethodologiesQuery } from "@/sanity/lib/queries";
import { methodologyClassLabel } from "@/lib/portal-labels";

interface Row {
  _id: string;
  name: string;
  slug: string;
  practice?: string | null;
  aiClassification?: string;
  provenStatus?: boolean;
}

export default async function MethodologiesListPage() {
  const rows = await sanityFetch<Row[]>({ query: allMethodologiesQuery });

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Production methodologies
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)" }}>
          {rows.length} document{rows.length === 1 ? "" : "s"} in Sanity
        </p>
      </div>

      <PortalPanel title="All methodologies">
        <div className="flex flex-col gap-0">
          {rows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
              No methodologies found.
            </p>
          ) : (
            rows.map((m) => (
              <BrowseListRow
                key={m._id}
                href={`/content/methodologies/${m.slug}`}
                title={m.name}
                subtitle={[m.practice ?? "Agency-wide", methodologyClassLabel(m.aiClassification)].filter(Boolean).join(" · ")}
              />
            ))
          )}
        </div>
      </PortalPanel>
    </div>
  );
}
