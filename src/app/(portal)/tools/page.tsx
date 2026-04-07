import Link from "next/link";
import PortalPanel from "@/components/portal/PortalPanel";

export default function ToolsPage() {
  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Tools
        </h1>
        <p className="text-sm mt-1 max-w-3xl" style={{ color: "var(--color-jda-warm-gray)" }}>
          Line-of-business modules (RFP scraper, proposal generator, meeting intelligence, etc.) will live here as they
          ship. Step 8 in the implementation plan tracks candidates and dependencies (including n8n).
        </p>
      </div>

      <PortalPanel title="Status">
        <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-jda-cream-muted)" }}>
          No LOB tools are wired into this portal build yet. The Alexandria MCP bridge and Sanity-backed content library
          remain the primary practitioner surfaces today.
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-jda-warm-gray)" }}>
          Meanwhile: browse production content under{" "}
          <Link href="/content" className="font-semibold underline" style={{ color: "var(--color-jda-red)" }}>
            Content
          </Link>{" "}
          and client packages under{" "}
          <Link href="/clients" className="font-semibold underline" style={{ color: "var(--color-jda-red)" }}>
            Clients
          </Link>
          .
        </p>
      </PortalPanel>
    </div>
  );
}
