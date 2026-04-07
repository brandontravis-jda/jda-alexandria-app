import BrowseListRow from "@/components/portal/BrowseListRow";
import PortalPanel from "@/components/portal/PortalPanel";
import { templateFormatLabel, templateStatusLabel } from "@/lib/portal-labels";
import { sanityFetch } from "@/sanity/lib/client";
import { allTemplatesQuery } from "@/sanity/lib/queries";

interface Row {
  _id: string;
  title: string;
  slug: string;
  formatType?: string;
  status?: string;
}

export default async function TemplatesListPage() {
  const rows = await sanityFetch<Row[]>({ query: allTemplatesQuery });

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Templates
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)" }}>
          {rows.length} document{rows.length === 1 ? "" : "s"} in Sanity
        </p>
      </div>

      <PortalPanel title="All templates">
        <div className="flex flex-col gap-0">
          {rows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
              No templates found.
            </p>
          ) : (
            rows.map((t) => (
              <BrowseListRow
                key={t._id}
                href={`/content/templates/${t.slug}`}
                title={t.title}
                subtitle={templateFormatLabel(t.formatType)}
                right={templateStatusLabel(t.status)}
              />
            ))
          )}
        </div>
      </PortalPanel>
    </div>
  );
}
