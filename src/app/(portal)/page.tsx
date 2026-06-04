import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTier } from "@/lib/portal-auth";
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
  type: string;
  updated_at: string;
  title: string | null;
  slug: string | null;
  id: number;
}

interface PracticeAreaRow {
  slug: string;
  name: string;
  activation_status: string | null;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function activationProgress(status: string | null | undefined): { progress: number; status: "green" | "amber" | "gray" } {
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
  switch (row.type) {
    case "methodology":
      return `/content/methodologies/${row.id}`;
    case "template":
      return `/content/templates/${row.id}`;
    case "brand_package":
      return `/clients/${row.id}`;
    default:
      return "/content";
  }
}

function recentDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    methodology: "Methodology",
    template: "Template",
    brand_package: "Brand package",
  };
  return labels[type] ?? type;
}

async function getContentCounts(): Promise<ContentCounts> {
  const [methodologies, templatesActive, templatesTotal, brandPackages, capabilities, practices] =
    await Promise.all([
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM methodologies`,
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM templates WHERE status = 'active'`,
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM templates`,
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM brand_packages`,
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM capability_records`,
      db<{ count: string }[]>`SELECT count(*)::text AS count FROM practices`,
    ]);
  return {
    methodologyCount: Number(methodologies[0]?.count ?? 0),
    templateActiveCount: Number(templatesActive[0]?.count ?? 0),
    templateTotalCount: Number(templatesTotal[0]?.count ?? 0),
    brandPackageCount: Number(brandPackages[0]?.count ?? 0),
    capabilityCount: Number(capabilities[0]?.count ?? 0),
    practiceAreaCount: Number(practices[0]?.count ?? 0),
  };
}

async function getRecentDocs(): Promise<RecentDoc[]> {
  return db<RecentDoc[]>`
    (
      SELECT 'methodology' AS type, updated_at::text AS updated_at, name AS title, slug, id
      FROM methodologies ORDER BY updated_at DESC NULLS LAST LIMIT 10
    )
    UNION ALL
    (
      SELECT 'template' AS type, updated_at::text AS updated_at, title, slug, id
      FROM templates ORDER BY updated_at DESC NULLS LAST LIMIT 10
    )
    UNION ALL
    (
      SELECT 'brand_package' AS type, updated_at::text AS updated_at, client_name AS title, slug, id
      FROM brand_packages ORDER BY updated_at DESC NULLS LAST LIMIT 10
    )
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 10
  `;
}

async function getPracticeAreas(): Promise<PracticeAreaRow[]> {
  return db<PracticeAreaRow[]>`
    SELECT name, slug, activation_status
    FROM practices
    ORDER BY name ASC
  `;
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
  await requireTier("viewer");
  const session = await auth();
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();

  const [counts, recentDocs, practiceAreas, userCount, recentUsers] = await Promise.all([
    getContentCounts(),
    getRecentDocs(),
    getPracticeAreas(),
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
        <StatCard label="Methodologies" value={String(counts.methodologyCount)} />
        <StatCard
          label="Templates"
          value={String(counts.templateActiveCount)}
          change={`${counts.templateTotalCount} total`}
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
          title="Recently updated"
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
                  key={`${row.type}-${row.id}-${i}`}
                  href={recentDocHref(row)}
                  title={row.title ?? "Untitled"}
                  subtitle={recentDocTypeLabel(row.type)}
                  right={new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                    new Date(row.updated_at)
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
              href="/practices"
              className="text-xs font-semibold no-underline"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-jda-red)",
              }}
            >
              Manage
            </Link>
          }
        >
          <div className="flex flex-col gap-0">
            {practiceAreas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>
                No practice areas found.
              </p>
            ) : (
              practiceAreas.map((p) => {
                const { progress, status } = activationProgress(p.activation_status);
                return (
                  <PracticeRow
                    key={p.slug}
                    name={p.name}
                    meta={p.activation_status ?? "—"}
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
