import { StatCard } from "@/components/portal/StatCard";
import { ContentRow } from "@/components/portal/ContentRow";
import { PracticeRow } from "@/components/portal/PracticeRow";
import { ActivityItem } from "@/components/portal/ActivityItem";
import { McpQueryRow } from "@/components/portal/McpQueryRow";
import { QuickAction } from "@/components/portal/QuickAction";

export default function DashboardPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="mb-7">
        <h1
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          Good afternoon, <span style={{ color: "var(--color-jda-red)" }}>Brandon</span>
        </h1>
        <p
          className="text-sm mt-1 font-normal"
          style={{ color: "var(--color-jda-warm-gray)", letterSpacing: "0.03em", fontFamily: "var(--font-body)", textTransform: "none" }}
        >
          Saturday, March 21, 2026 — Alexandria — 14 active content items across 5 practices — 23 practitioners connected via MCP
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <StatCard label="Prompt library" value="47" change="+8 this week" changeColor="green" />
        <StatCard label="Templates" value="12" change="3 need review" changeColor="amber" />
        <StatCard label="MCP queries today" value="312" valueColor="red" change="+41% vs last week" changeColor="green" />
        <StatCard label="Active practitioners" value="23" change="of 33 total" changeColor="muted" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <QuickAction icon="+" iconColor="red" label="New prompt" sub="Add to prompt library" href="/content/new?type=prompt" />
        <QuickAction icon="T" iconColor="blue" label="New template" sub="Create production template" href="/content/new?type=template" />
        <QuickAction icon="C" iconColor="green" label="New client package" sub="Build brand context" href="/clients/new" />
      </div>

      {/* Main grid */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* Recent content */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}
            >
              Recent content
            </span>
            <span
              className="text-xs font-semibold cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-jda-red)" }}
            >
              View all
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <ContentRow type="prompt" name="Press release — standard format" practice="StratComm" date="2h ago" />
            <ContentRow type="template" name="JDA styled document — v3" practice="Agency-wide" date="Yesterday" />
            <ContentRow type="brand" name="WIF — brand voice + messaging" practice="Brand" date="Mar 18" />
            <ContentRow type="workflow" name="Campaign brief → deliverable chain" practice="Digital" date="Mar 17" />
            <ContentRow type="prompt" name="Social carousel — AI-led production" practice="Brand" date="Mar 15" />
            <ContentRow type="template" name="Editorial HTML presentation" practice="Agency-wide" date="Mar 14" />
          </div>
        </div>

        {/* Practice activation */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}
            >
              Practice activation
            </span>
            <span
              className="text-xs font-semibold cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-jda-red)" }}
            >
              Details
            </span>
          </div>
          <div className="flex flex-col gap-0">
            <PracticeRow name="Dev / Digital Experience" meta="8 of 8 connected" progress={100} status="green" />
            <PracticeRow name="Business Development" meta="4 of 4 connected" progress={100} status="green" />
            <PracticeRow name="Strategic Communications" meta="5 of 7 connected" progress={71} status="amber" />
            <PracticeRow name="Brand" meta="3 of 6 connected" progress={50} status="amber" />
            <PracticeRow name="Creative" meta="3 of 8 connected" progress={38} status="gray" />
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* MCP top queries */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}
            >
              MCP activity — top queries
            </span>
            <span
              className="text-xs font-semibold cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-jda-red)" }}
            >
              Full log
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <McpQueryRow query='get_prompt_chain("press_release")' calls={34} practice="StratComm" />
            <McpQueryRow query='assemble_production_context("social_carousel", "WIF")' calls={28} practice="Brand" />
            <McpQueryRow query='get_client_brand_package("1792")' calls={22} practice="Multiple" />
            <McpQueryRow query='get_template("campaign_brief")' calls={19} practice="Digital" />
            <McpQueryRow query='list_templates("brand")' calls={15} practice="Brand" />
          </div>
        </div>

        {/* Recent activity */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}
            >
              Recent activity
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <ActivityItem
              actor="Christina"
              action='added deliverable classification "social media carousel" via Claude'
              time="35 min ago"
              dotColor="red"
            />
            <ActivityItem
              actor="Hannah"
              action="queried brand voice for WIF — first MCP interaction"
              time="1h ago"
              dotColor="blue"
            />
            <ActivityItem
              actor="Brandon"
              action="published 3 new prompt library entries for StratComm"
              time="2h ago"
              dotColor="green"
            />
            <ActivityItem
              actor="Kristi"
              action="updated Brand workflow guide via portal"
              time="Yesterday"
              dotColor="amber"
            />
            <ActivityItem
              actor="Zeke"
              action="connected to MCP — Creative practice at 38%"
              time="Yesterday"
              dotColor="gray"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
