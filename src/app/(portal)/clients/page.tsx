import BrowseListRow from "@/components/portal/BrowseListRow";
import PortalPanel from "@/components/portal/PortalPanel";
import { sanityFetch } from "@/sanity/lib/client";
import { allBrandPackagesQuery } from "@/sanity/lib/queries";

interface Row {
  _id: string;
  clientName: string;
  slug: string;
  abbreviations?: string;
  extractedDate?: string;
  sourceDocument?: string;
}

export default async function ClientsListPage() {
  const rows = await sanityFetch<Row[]>({ query: allBrandPackagesQuery });

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Clients
        </h1>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
          Brand packages Alexandria serves to Claude via MCP. Open a client for a readable summary; full markdown and
          structured fields are edited in Studio.
        </p>
      </div>

      <PortalPanel title="Brand packages">
        <div className="flex flex-col gap-0">
          {rows.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
              No brand packages found.
            </p>
          ) : (
            rows.map((r) => (
              <BrowseListRow
                key={r._id}
                href={`/clients/${r.slug}`}
                title={r.clientName}
                subtitle={r.abbreviations ? `Also known as: ${r.abbreviations}` : r.sourceDocument ?? undefined}
              />
            ))
          )}
        </div>
      </PortalPanel>
    </div>
  );
}
