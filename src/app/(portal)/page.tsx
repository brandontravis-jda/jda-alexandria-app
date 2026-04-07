import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { practiceActivationLabel } from "@/lib/portal-labels";
import { sanityFetch } from "@/sanity/lib/client";
import {
  allPracticeAreasQuery,
  portalContentCountsQuery,
  recentSanityDocumentsQuery,
} from "@/sanity/lib/queries";
import { PracticeRow } from "@/components/portal/PracticeRow";
import { QuickAction } from "@/components/portal/QuickAction";
import { StatCard } from "@/components/portal/StatCard";
import BrowseListRow from "@/components/portal/BrowseListRow";
import PortalPanel from "@/components/portal/PortalPanel";

export const dynamic = "force-dynamic";

interface ContentCounts {
  methodologyCount: number;
  templateActiveCount: number;
  templateTotalCount: number;
  brandPackageCount: number;
  capabilityCount: number;
  practiceAreaCount: number;
}

interface RecentDoc {
  _type: string;
  _updatedAt: string;
  title: string | null;
  slug: string | null;
}

interface PracticeAreaRow {
  _id: string;
  name: string;
  activationStatus?: string;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function activationProgress(status: string | undefined): { progress: number; status: "green" | "amber" | "gray" } {
  switch (status) {
    case "active":
      return { progress: 100, status: "green" };
    case "activating":
      return { progress: 66, status: "amber" };
    case "in_discovery":
      return { progress: 33, status: "amber" };
    default:
      return { progress: 0, status: "gray" };
  }
}

function recentDocHref(row: RecentDoc): string {
  if (!row.slug) return "/content";
  switch (row._type) {
    case "productionMethodology":
      return `/content/methodologies/${row.slug}`;
    case "template":
      return `/content/templates/${row.slug}`;
    case "clientBrandPackage":
      return `/clients/${row.slug}`;
    default:
      return "/content";
  }
}

function recentDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    productionMethodology: "Methodology",
    template: "Template",
    clientBrandPackage: "Brand package",
  };
  return labels[type] ?? type;
}

async function getUserCount(): Promise<number | null> {
  try {
    const rows = await db<{ count: string }[]>`SELECT count(*)::text AS count FROM users`;
    return Number(rows[0]?.count ?? 0);
  } catch {
    return null;
  }
}

async function getRecentUsers(): Promise<{ name: string | null; last_seen_at: string }[]> {
  try {
    return await db<{ name: string | null; last_seen_at: string }[]>`
      SELECT name, last_seen_at::text AS last_seen_at
      FROM users
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 8
    `;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();

  const [counts, recentDocs, practiceAreas, userCount, recentUsers] = await Promise.all([
    sanityFetch<ContentCounts>({ query: portalContentCountsQuery }),
    sanityFetch<RecentDoc[]>({ query: recentSanityDocumentsQuery }),
    sanityFetch<PracticeAreaRow[]>({ query: allPracticeAreasQuery }),
    getUserCount(),
    getRecentUsers(),
  ]);

  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          {greeting(hour)}, <span style={{ color: "var(--color-jda-red)" }}>{firstName}</span>
        </h1>
        <p
          className="text-sm mt-1 font-normal max-w-4xl"
          style={{
            color: "var(--color-jda-warm-gray)",
            letterSpacing: "0.03em",
            fontFamily: "var(--font-body)",
            textTransform: "none",
          }}
        >
          {dateLine} — Alexandria — {counts.methodologyCount} methodologies, {counts.templateTotalCount} templates (
          {counts.templateActiveCount} active), {counts.brandPackageCount} brand packages, {counts.capabilityCount}{" "}
          capability records
          {userCount !== null ? ` — ${userCount} portal user${userCount === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Methodologies" value={String(counts.methodologyCount)} change="In Sanity" changeColor="muted" />
        <StatCard
          label="Templates"
          value={String(counts.templateActiveCount)}
          change={`${counts.templateTotalCount} total in Sanity`}
          changeColor="muted"
        />
        <StatCard
          label="Capability records"
          value={String(counts.capabilityCount)}
          change="See Capabilities in the nav"
          changeColor="green"
        />
        <StatCard
          label="Portal users"
          value={userCount !== null ? String(userCount) : "—"}
          change={userCount !== null ? "Postgres / auth" : "DB unavailable"}
          changeColor={userCount !== null ? "muted" : "amber"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <QuickAction icon="M" iconColor="red" label="Methodologies" sub="Browse production workflows" href="/content/methodologies" />
        <QuickAction icon="T" iconColor="blue" label="Templates" sub="HTML, Word, email formats" href="/content/templates" />
        <QuickAction icon="C" iconColor="green" label="Clients" sub="Brand packages" href="/clients" />
      </div>

      <div className="grid gap-5 mb-5 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PortalPanel
          title="Recently updated in Sanity"
          action={
            <Link
              href="/content"
              className="text-xs font-semibold no-underline"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-jda-red)",
              }}
            >
              Content library
            </Link>
          }
        >
          <div className="flex flex-col gap-0">
            {recentDocs.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                No documents yet.
              </p>
            ) : (
              recentDocs.map((row, i) => (
                <BrowseListRow
                  key={`${row._type}-${row.slug}-${i}`}
                  href={recentDocHref(row)}
                  title={row.title ?? "Untitled"}
                  subtitle={recentDocTypeLabel(row._type)}
                  right={new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                    new Date(row._updatedAt)
                  )}
                />
              ))
            )}
          </div>
        </PortalPanel>

        <PortalPanel
          title="Practice areas"
          action={
            <Link
              href="/studio"
              className="text-xs font-semibold no-underline"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-jda-red)",
              }}
            >
              Studio ↗
            </Link>
          }
        >
          <div className="flex flex-col gap-0">
            {practiceAreas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                No practice areas in Sanity.
              </p>
            ) : (
              practiceAreas.map((p) => {
                const { progress, status } = activationProgress(p.activationStatus);
                return (
                  <PracticeRow
                    key={p._id}
                    name={p.name}
                    meta={practiceActivationLabel(p.activationStatus)}
                    progress={progress}
                    status={status}
                  />
                );
              })
            )}
          </div>
        </PortalPanel>
      </div>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PortalPanel title="MCP activity & adoption">
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-jda-cream-muted)" }}>
            Request volume, top tools, and unsupported-request trends ship with{" "}
            <strong style={{ color: "var(--color-jda-cream)" }}>Step 6.b</strong> (measurement dashboards) using{" "}
            <code className="text-xs">alexandria_request_log</code> and related aggregates.
          </p>
        </PortalPanel>

        <PortalPanel title="Recent portal sign-ins">
          {recentUsers.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
              No users in Postgres yet, or database unreachable from this environment.
            </p>
          ) : (
            <ul className="space-y-3 text-sm" style={{ color: "var(--color-jda-cream-muted)" }}>
              {recentUsers.map((u, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="font-medium" style={{ color: "var(--color-jda-cream)" }}>
                    {u.name ?? "Unknown"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-jda-warm-gray)" }}>
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(u.last_seen_at)
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PortalPanel>
      </div>
    </div>
  );
}
