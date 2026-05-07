import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LibraryBig, MonitorCog, Rocket, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityFeed } from "@/components/operator/activity-feed";
import { ensureProfile } from "@/lib/services/profiles";
import { agentRegistry, getAgentOperationsSummary } from "@/lib/agents/registry";
import { getRecentActivity } from "@/lib/services/activity";
import { getCampaigns } from "@/lib/services/campaigns";
import { getMediaAssets } from "@/lib/services/media-storage";
import { getFailureSnapshot, getOperatorMetrics, getReviewQueue, getSystemAvailabilitySummary } from "@/lib/services/operator";

const pipeline = [
  "Prompt enters Studio",
  "Dashboard assigns a ChatGPT Agent",
  "Task becomes a generation job",
  "Supabase stores asset outputs",
  "Campaign and promotion packages are assembled",
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureProfile();
  const activity = getRecentActivity(4);
  const agentSummary = getAgentOperationsSummary();
  const campaigns = getCampaigns();
  const recentMedia = getMediaAssets().slice(0, 3);
  const latestCampaigns = campaigns.slice(0, 3);
  const operatorMetrics = getOperatorMetrics();
  const failures = getFailureSnapshot();
  const reviewQueue = getReviewQueue();
  const availability = getSystemAvailabilitySummary();
  const metrics = [
    {
      label: "Registered agents",
      value: String(agentSummary.totalAgents),
      detail: "ChatGPT execution specialists mapped into the control plane",
    },
    {
      label: "Supported task types",
      value: String(agentSummary.taskCoverage),
      detail: "Distinct task contracts available for assignment",
    },
    {
      label: "Available agents",
      value: String(agentSummary.availableAgents),
      detail: "Ready for assignment from the dashboard command layer",
    },
    {
      label: "Campaigns in motion",
      value: String(campaigns.filter((campaign) => ["building", "ready", "active"].includes(campaign.status)).length),
      detail: "Campaigns currently moving through builder and launch prep",
    },
  ];

  return (
    <AppShell
      eyebrow="Dashboard"
      title="Direct AI media operations, routed through existing ChatGPT Agents."
      description="Runners Circle Agent OS is the command center for prompt intake, structured agent assignments, generation job tracking, media storage, and downstream campaign packaging."
      action={
        <Link
          href="/studio/image"
          className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft"
        >
          Launch image task
          <ArrowRight className="size-4" />
        </Link>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel-strong p-6">
          <p className="eyebrow">Mission Flow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            One pipeline from creative prompt to promotion package.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            The dashboard is built around operator intent: every action translates into a persistent task record,
            a generation job, and a downstream path toward assets, campaigns, and promotion outputs.
          </p>

          <div className="mt-6 grid gap-3">
            {pipeline.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">0{index + 1}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-5 sm:grid-cols-2">
          {metrics.map((metric) => (
            <article key={metric.label} className="panel p-5">
              <p className="field-label">{metric.label}</p>
              <p className="metric-value mt-3">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{metric.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <ActivityFeed
          items={activity}
          compact
          eyebrow="Recent Activity"
          title="What changed across the control layer"
          badge="Live view"
        />

        <div className="grid gap-5">
          <article className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">System Health</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Operator snapshot at a glance</h2>
              </div>
              <Link href="/operator" className="status-pill border-electric/20 bg-electric/10 text-electric">
                Open console
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="field-label">Failures</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{failures.length}</p>
                <p className="mt-2 text-sm text-muted">Open system, campaign, media, or task issues.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="field-label">Review queue</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{reviewQueue.length}</p>
                <p className="mt-2 text-sm text-muted">Items waiting on operator approval or QA.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="field-label">Agent readiness</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{availability.availableAgents}</p>
                <p className="mt-2 text-sm text-muted">
                  available of {availability.totalAgents}; {availability.offlineAgents} offline.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-foreground">Downloads today</p>
                <div className="status-pill">{operatorMetrics.downloadsToday}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                The Operator Console tracks download handoffs, queue pressure, and review backlog before live database
                and realtime wiring are added.
              </p>
            </div>
          </article>

          <article className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Registry Map</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Agent readiness by task contract</h2>
              </div>
              <div className="status-pill">Execution layer</div>
            </div>

            <div className="mt-6 space-y-3">
              {agentRegistry.map((agent) => (
                <div key={agent.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                      <p className="mt-1 text-sm text-muted">{agent.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{agent.acceptedTaskTypes.length}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">tasks</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Media</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Latest generated assets in the control plane</h2>
            </div>
            <Link href="/media" className="status-pill border-electric/20 bg-electric/10 text-electric">
              Open library
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentMedia.map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <div className="overflow-hidden rounded-[20px] border border-white/8 bg-black/20">
                    <Image
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      width={1200}
                      height={900}
                      unoptimized
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-foreground">{asset.title}</p>
                        <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/80">
                          {asset.status}
                        </div>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted">{asset.type}</p>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {asset.prompt.length > 120 ? `${asset.prompt.slice(0, 117)}...` : asset.prompt}
                      </p>
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-foreground/70">
                      assignedAgentId: {asset.assignedAgentId}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active Campaigns</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Latest campaigns flowing through the builder pipeline
              </h2>
            </div>
            <Link href="/campaigns" className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
              Open campaigns
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {latestCampaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
                      {campaign.objective.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/80">{campaign.status}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{campaign.nextAction}</p>
                <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-foreground/70">
                  media: {campaign.assignedMediaIds.length} | agent: {campaign.assignedAgentId}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/studio" className="panel interactive-border p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Studio</p>
            <Sparkles className="size-5 text-orange" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Generate image and video tasks</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Move from raw creative direction into structured generation jobs and agent assignments.
          </p>
        </Link>

        <Link href="/media" className="panel interactive-border p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Media Library</p>
            <LibraryBig className="size-5 text-electric" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Track stored assets</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Preview job outputs, resolve downloads, and keep storage paths tied to campaign packages.
          </p>
        </Link>

        <Link href="/promotions" className="panel interactive-border p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Promotion prep</p>
            <Rocket className="size-5 text-orange-soft" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Package for outbound launch</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Assemble media into promotion bundles with reusable channel notes and deliverable lists.
          </p>
        </Link>

        <Link href="/operator" className="panel interactive-border p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Operator Console</p>
            <MonitorCog className="size-5 text-electric" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Watch queue health and failures</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Track activity, review backlog, failures, and next recommended moves from the command room.
          </p>
        </Link>
      </section>
    </AppShell>
  );
}
