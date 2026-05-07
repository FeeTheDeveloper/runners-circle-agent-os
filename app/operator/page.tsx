import { ActivityFeed } from "@/components/operator/activity-feed";
import { FailurePanel } from "@/components/operator/failure-panel";
import { NextActionsPanel } from "@/components/operator/next-actions-panel";
import { OperatorMetricCard } from "@/components/operator/operator-metric-card";
import { QueuePanel } from "@/components/operator/queue-panel";
import { ReviewPanel } from "@/components/operator/review-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getRecentActivity } from "@/lib/services/activity";
import {
  getFailureSnapshot,
  getNextRecommendedActions,
  getOperatorMetrics,
  getQueueSnapshot,
  getReviewQueue,
  getSystemAvailabilitySummary,
} from "@/lib/services/operator";

export const dynamic = "force-dynamic";

export default function OperatorPage() {
  const metrics = getOperatorMetrics();
  const queues = getQueueSnapshot();
  const failures = getFailureSnapshot();
  const reviewQueue = getReviewQueue();
  const nextActions = getNextRecommendedActions();
  const recentActivity = getRecentActivity(10);
  const availability = getSystemAvailabilitySummary();
  const healthTone = failures.length > 0 ? "warning" : "success";
  const healthLabel = failures.length > 0 ? "Attention required" : "Stable";
  const metricCards = [
    {
      label: "Queued tasks",
      value: metrics.queuedTasks,
      detail: "New work waiting to enter an execution lane.",
      tone: "accent" as const,
    },
    {
      label: "Executing tasks",
      value: metrics.executingTasks,
      detail: "Active task contracts currently moving through the pipeline.",
      tone: "success" as const,
    },
    {
      label: "Failed tasks",
      value: metrics.failedTasks,
      detail: "Assignments that need retry logic or operator intervention.",
      tone: metrics.failedTasks > 0 ? ("error" as const) : ("default" as const),
    },
    {
      label: "Ready media",
      value: metrics.readyMediaAssets,
      detail: "Media assets already cleared for downstream campaign or promotion use.",
      tone: "default" as const,
    },
    {
      label: "Active campaigns",
      value: metrics.activeCampaigns,
      detail: "Campaigns currently in active circulation.",
      tone: "default" as const,
    },
    {
      label: "Prepared promotions",
      value: metrics.preparedPromotions,
      detail: "Packages prepared, reviewed, or approved for channel delivery.",
      tone: "accent" as const,
    },
  ];

  return (
    <AppShell
      eyebrow="Operator Console"
      title="Control the machine from one command room."
      description="The control room watches agent tasks, generation flow, media activity, campaigns, promotions, downloads, and failures from one typed mock operations surface."
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">System Health</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Control the machine from one command room.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              This console is the command-center layer for operator awareness before live database wiring,
              realtime updates, and external ChatGPT Agent execution are connected.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
            <p className="field-label">Current state</p>
            <div className="mt-3 flex items-center gap-3">
              <div
                className={
                  healthTone === "warning"
                    ? "status-pill border-warning/30 bg-warning/10 text-warning"
                    : "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                }
              >
                {healthLabel}
              </div>
              <p className="text-sm text-muted">{failures.length} open issues across the command layer.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Agent availability</p>
            <p className="mt-3 text-xl font-semibold text-foreground">
              {availability.availableAgents}/{availability.totalAgents} available
            </p>
            <p className="mt-2 text-sm text-muted">
              {availability.busyAgents} busy, {availability.offlineAgents} offline.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Review backlog</p>
            <p className="mt-3 text-xl font-semibold text-foreground">{reviewQueue.length} items</p>
            <p className="mt-2 text-sm text-muted">Operator approvals and quality decisions waiting in line.</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Downloads today</p>
            <p className="mt-3 text-xl font-semibold text-foreground">{metrics.downloadsToday}</p>
            <p className="mt-2 text-sm text-muted">Asset handoffs recorded through the download pipeline.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <OperatorMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            detail={metric.detail}
            tone={metric.tone}
          />
        ))}
      </section>

      <section className="mt-5">
        <QueuePanel snapshot={queues} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <ReviewPanel items={reviewQueue} />
        <FailurePanel failures={failures} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <NextActionsPanel actions={nextActions} />
        <ActivityFeed items={recentActivity} badge="Live monitor" />
      </section>
    </AppShell>
  );
}
