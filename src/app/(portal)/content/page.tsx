"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PortalPanel from "@/components/portal/PortalPanel";
import BrowseListRow from "@/components/portal/BrowseListRow";

interface Counts {
  methodologies: number;
  templates: number;
  brands: number;
  deliverables: number;
}

export default function ContentHubPage() {
  const [counts, setCounts] = useState<Counts>({ methodologies: 0, templates: 0, brands: 0, deliverables: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, tRes, bRes, dRes] = await Promise.allSettled([
          fetch("/api/content/methodologies"),
          fetch("/api/content/templates"),
          fetch("/api/content/brand-packages"),
          fetch("/api/content/deliverables"),
        ]);

        const mData = mRes.status === "fulfilled" && mRes.value.ok ? await mRes.value.json() : null;
        const tData = tRes.status === "fulfilled" && tRes.value.ok ? await tRes.value.json() : null;
        const bData = bRes.status === "fulfilled" && bRes.value.ok ? await bRes.value.json() : null;
        const dData = dRes.status === "fulfilled" && dRes.value.ok ? await dRes.value.json() : null;

        setCounts({
          methodologies: mData?.methodologies?.length ?? 0,
          templates: tData?.templates?.length ?? 0,
          brands: bData?.brand_packages?.length ?? 0,
          deliverables: dData?.deliverables?.length ?? 0,
        });
      } catch {
        // counts stay at 0
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const countLabel = (n: number) => (loading ? "…" : String(n));

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
          Browse everything Alexandria serves through MCP. Authoring and editing is done directly in the portal.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 mb-7">
        <PortalPanel title="Browse by type">
          <div className="flex flex-col gap-0">
            <BrowseListRow
              href="/content/methodologies"
              title="Production methodologies"
              subtitle="Step-by-step production workflows"
              right={countLabel(counts.methodologies)}
            />
            <BrowseListRow
              href="/content/templates"
              title="Templates"
              subtitle="HTML, Word, and email production templates"
              right={countLabel(counts.templates)}
            />
            <BrowseListRow
              href="/clients"
              title="Client brand packages"
              subtitle="Voice, color, typography, and markdown context"
              right={countLabel(counts.brands)}
            />
            <BrowseListRow
              href="/content/deliverables"
              title="Deliverable classifications"
              subtitle="Taxonomy aligned to the capabilities matrix"
              right={countLabel(counts.deliverables)}
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
