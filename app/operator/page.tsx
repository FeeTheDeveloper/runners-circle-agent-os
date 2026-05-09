import { ActivityFeed } from "@/components/operator/activity-feed";
import { BillingStatusCard } from "@/components/billing/billing-status-card";
import { UpgradeCta } from "@/components/billing/upgrade-cta";
import { UsageMeter } from "@/components/billing/usage-meter";
import { DistributionJobCard } from "@/components/distribution/distribution-job-card";
import { ExecutionPanel } from "@/components/operator/execution-panel";
import { FailurePanel } from "@/components/operator/failure-panel";
import { NextActionsPanel } from "@/components/operator/next-actions-panel";
import { OperatorMetricCard } from "@/components/operator/operator-metric-card";
import { QueuePanel } from "@/components/operator/queue-panel";
import { ReviewPanel } from "@/components/operator/review-panel";
import { WorkflowRunCard } from "@/components/workflows/workflow-run-card";
import { AppShell } from "@/components/layout/app-shell";
import { getRecentActivity } from "@/lib/services/activity";
import { getExecutionPackages, getExecutionResults } from "@/lib/services/agent-execution";
import { getBillingAccount, getBillingReadiness, getCurrentPlan, getUpgradeOptions } from "@/lib/services/billing";
import {
  getDistributionJobs,
  getDistributionOperationalSummary,
  getDistributionReadinessSummary,
} from "@/lib/services/distribution";
import {
  getActivePipelineView,
  getAgentCoverageMap,
  getAgentName,
  getRoutingReadinessSummary,
  getTaskTypeDisplayName,
} from "@/lib/services/agent-router";
import { getAgentTasks } from "@/lib/services/agent-tasks";
import {
  getFailureSnapshot,
  getNextRecommendedActions,
  getOperatorMetrics,
  getQueueSnapshot,
  getReviewQueue,
  getSystemAvailabilitySummary,
} from "@/lib/services/operator";
import { getRealtimeOperatorSnapshot } from "@/lib/services/realtime";
import { getApprovalRequestSummaries, getLatestApprovalRequestForEntity } from "@/lib/services/reviews";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getCurrentUserTeams, getTeamMembers } from "@/lib/services/teams";
import { getUsageSnapshot } from "@/lib/services/usage";
import {
  getWorkflowOperationalSummary,
  getWorkflowProgress,
  getWorkflowRuns,
  getWorkflowTemplateById,
} from "@/lib/services/workflows";

export const dynamic = "force-dynamic";

function getUsedValue(limit: number | null, remaining: number | null, fallbackUsed = 0) {
  if (limit === null || remaining === null) {
    return fallbackUsed;
  }

  return Math.max(limit - remaining, 0);
}

export default async function OperatorPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const teamMembers = currentTeam ? await getTeamMembers(currentTeam.id) : [];
  const billingAccount = getBillingAccount(userId, currentTeam?.id ?? null);
  const billingReadiness = getBillingReadiness();
  const currentPlan = getCurrentPlan(userId, currentTeam?.id ?? null);
  const upgradeOptions = getUpgradeOptions(userId, currentTeam?.id ?? null);
  const usageSnapshot = getUsageSnapshot(userId, currentTeam?.id ?? null, currentTeam ? teamMembers.length : 1);
  const tasks = getAgentTasks();
  const executionPackages = getExecutionPackages();
  const executionResults = executionPackages.flatMap((executionPackage) => getExecutionResults(executionPackage.id));
  const distributionJobs = getDistributionJobs({
    teamId: currentTeam?.id ?? undefined,
  });
  const distributionSummary = getDistributionOperationalSummary({
    teamId: currentTeam?.id ?? undefined,
  });
  const distributionReadiness = getDistributionReadinessSummary({
    teamId: currentTeam?.id ?? undefined,
  });
  const metrics = getOperatorMetrics();
  const queues = getQueueSnapshot();
  const failures = getFailureSnapshot();
  const reviewQueue = getReviewQueue();
  const nextActions = getNextRecommendedActions();
  const recentActivity = getRecentActivity(10);
  const availability = getSystemAvailabilitySummary();
  const realtimeSnapshot = getRealtimeOperatorSnapshot(currentTeam?.id ?? null);
  const approvalRequests = getApprovalRequestSummaries({ teamId: currentTeam?.id ?? undefined });
  const distributionReviewRequestByJobId = Object.fromEntries(
    distributionJobs.map((job) => [job.id, getLatestApprovalRequestForEntity("distribution_job", job.id)]),
  );
  const coverageMap = getAgentCoverageMap();
  const routingReadiness = getRoutingReadinessSummary();
  const activePipeline = getActivePipelineView(6);
  const workflowRuns = getWorkflowRuns();
  const reviewRequestByRunId = Object.fromEntries(
    workflowRuns.map((run) => [run.id, getLatestApprovalRequestForEntity("workflow_run", run.id)]),
  );
  const workflowProgressByRunId = Object.fromEntries(
    workflowRuns
      .map((run) => [run.id, getWorkflowProgress(run.id)] as const)
      .filter((entry): entry is readonly [string, NonNullable<ReturnType<typeof getWorkflowProgress>>] => entry[1] !== null),
  );
  const workflowSummary = getWorkflowOperationalSummary();
  const activeWorkflowRuns = workflowRuns.filter((run) => ["ready", "running", "paused", "needs_review"].includes(run.status));
  const stuckWorkflowRuns = workflowRuns.filter((run) => ["paused", "needs_review", "failed"].includes(run.status));
  const reviewWorkflowRuns = workflowRuns.filter((run) => run.status === "needs_review");
  const reviewRequiredDistributionJobs = distributionJobs.filter((job) => {
    const reviewRequest = distributionReviewRequestByJobId[job.id];

    if (reviewRequest?.status === "approved") {
      return false;
    }

    return job.metadata.requiresApproval === true || reviewRequest?.status === "pending_review";
  });
  const scheduledDistributionJobs = distributionJobs.filter((job) => job.status === "scheduled" || job.status === "publishing");
  const failedDistributionJobs = distributionJobs.filter((job) => job.status === "failed");
  const liveDeploymentStatus = distributionReadiness.livePublishingEnabled
    ? "Live publishing enabled"
    : "Manual and mock deployment only";
  const nextWorkflowRun = workflowSummary.nextActionRunId
    ? workflowRuns.find((run) => run.id === workflowSummary.nextActionRunId) ?? null
    : null;
  const activeOperators = teamMembers.filter((member) => ["owner", "admin", "operator"].includes(member.role));
  const reviewerQueue = teamMembers
    .filter((member) => ["owner", "admin", "reviewer"].includes(member.role))
    .map((member) => ({
      reviewerId: member.userId,
      pendingCount: reviewQueue.filter((item) => item.owner === member.userId).length,
      role: member.role,
    }));
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
    {
      label: "Distribution jobs",
      value: metrics.distributionJobs,
      detail: "Channel deployment jobs tracked across social, email, and web lanes.",
      tone: "default" as const,
    },
    {
      label: "Scheduled posts",
      value: metrics.scheduledDistributionJobs,
      detail: "Jobs already committed to a schedule or manual deployment window.",
      tone: "accent" as const,
    },
  ];

  return (
    <AppShell
      eyebrow="Operator Console"
      title="Deploy campaigns from the command layer."
      description="The command room now tracks team operators, approval pressure, workflow readiness, distribution jobs, realtime subscription posture, campaigns, promotions, downloads, and execution handoffs from one shared surface."
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">System Health</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Deploy campaigns from the command layer.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              This console is the shared command-center layer for team awareness before live database wiring,
              realtime subscriptions, direct publishing integrations, and external ChatGPT Agent execution are fully connected.
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
            <p className="field-label">Active operators</p>
            <p className="mt-3 text-xl font-semibold text-foreground">{activeOperators.length}</p>
            <p className="mt-2 text-sm text-muted">Owner, admin, and operator seats currently covering the command room.</p>
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

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Usage Risk</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Low credits, seat pressure, and billing readiness</h2>
            </div>
            <div className="status-pill border-warning/30 bg-warning/10 text-warning">
              {usageSnapshot.warnings.length} alerts
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <UsageMeter
              label="Agent tasks"
              used={getUsedValue(currentPlan.agentTaskCredits, usageSnapshot.balance.agentTaskCredits)}
              limit={currentPlan.agentTaskCredits}
              unit="tasks"
              detail="Task throughput pressure inside the active plan."
            />
            <UsageMeter
              label="Distribution jobs"
              used={getUsedValue(currentPlan.distributionLimit, usageSnapshot.balance.distributionLimit)}
              limit={currentPlan.distributionLimit}
              unit="jobs"
              detail="Outbound deployment runway for the current cycle."
            />
          </div>

          <div className="mt-5 space-y-3">
            {usageSnapshot.warnings.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-sm text-muted">No immediate billing risk. Soft enforcement is active and checkout remains intentionally disconnected.</p>
              </div>
            ) : (
              usageSnapshot.warnings.map((warning) => (
                <div key={warning} className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                  <p className="text-sm leading-6 text-foreground">{warning}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <BillingStatusCard account={billingAccount} readiness={billingReadiness} warningCount={usageSnapshot.warnings.length} />
      </section>

      <section className="mt-5">
        <UpgradeCta currentPlanTier={billingAccount.planTier} options={upgradeOptions} compact />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Team Activity</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Who is active across the command layer</h2>
            </div>
            <div className="status-pill">{currentTeam?.name ?? "Single-user mode"}</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Members</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{teamMembers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Approvals needing action</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {approvalRequests.filter((request) => request.status === "pending_review").length}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {activeOperators.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
                <p className="text-sm text-muted">No operator assignments are active yet.</p>
              </div>
            ) : (
              activeOperators.map((member) => (
                <div key={member.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{member.userId}</p>
                      <p className="mt-2 text-sm text-muted">Role: {member.role}</p>
                    </div>
                    <div className="status-pill capitalize">{member.role}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Reviewer Queue</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Approval coverage by reviewer</h2>
            </div>
            <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">{reviewQueue.length} pending</div>
          </div>

          <div className="mt-6 space-y-3">
            {reviewerQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
                <p className="text-sm text-muted">No reviewer assignments are active yet.</p>
              </div>
            ) : (
              reviewerQueue.map((entry) => (
                <div key={entry.reviewerId} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.reviewerId}</p>
                      <p className="mt-2 text-sm text-muted">Role: {entry.role}</p>
                    </div>
                    <div className="status-pill">{entry.pendingCount} pending</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Coverage Map</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Agent coverage by task contract</h2>
            </div>
            <div className="status-pill">{routingReadiness.coveredTaskTypes}/{routingReadiness.totalTaskTypes} live</div>
          </div>

          <div className="mt-6 space-y-3">
            {coverageMap.slice(0, 8).map((item) => (
              <div key={item.taskType} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{getTaskTypeDisplayName(item.taskType)}</p>
                    <p className="mt-1 text-sm text-muted">
                      Primary lanes: {item.primaryAgentIds.map(getAgentName).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">{item.availableAgents}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">ready</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Routing Readiness</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Handoff graph and orchestration state</h2>
            </div>
            <div
              className={
                routingReadiness.orchestrationReady
                  ? "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "status-pill border-warning/30 bg-warning/10 text-warning"
              }
            >
              {routingReadiness.orchestrationReady ? "orchestrated" : "degraded"}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Covered tasks</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{routingReadiness.coveredTaskTypes}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Handoff routes</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{routingReadiness.handoffRoutes}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Busy agents</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{routingReadiness.busyAgents}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Offline agents</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{routingReadiness.offlineAgents}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Uncovered contracts</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {routingReadiness.uncoveredTaskTypes.length === 0
                ? "All registered task contracts have routing support."
                : routingReadiness.uncoveredTaskTypes.map(getTaskTypeDisplayName).join(", ")}
            </p>
          </div>
        </article>
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active Pipeline View</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Current tasks mapped to their routing lane</h2>
            </div>
            <div className="status-pill">{activePipeline.length} tracked tasks</div>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-2">
            {activePipeline.map((item) => (
              <div key={item.taskId} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{getTaskTypeDisplayName(item.taskType)}</p>
                    <p className="mt-1 text-sm text-muted">
                      Primary: {getAgentName(item.primaryAgentId)} | Support: {item.supportingAgentIds.length}
                    </p>
                  </div>
                  <div className="status-pill capitalize">{item.status}</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="field-label">Priority</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-foreground">{item.priority}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                    <p className="field-label">Next handoff</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {item.nextHandoff ? getAgentName(item.nextHandoff.toAgentId) : "No downstream handoff"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted">
                  {item.nextHandoff ? item.nextHandoff.reason : "This task is already at the end of its current route."}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Workflow Command Layer</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Active runs, review blocks, and stuck workflow lanes</h2>
            </div>
            <div className="status-pill border-electric/20 bg-electric/10 text-electric">{activeWorkflowRuns.length} active</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Active workflow runs</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{activeWorkflowRuns.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Stuck workflows</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stuckWorkflowRuns.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Needs review</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{reviewWorkflowRuns.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Next workflow action</p>
              <p className="mt-2 text-sm leading-6 text-muted">{workflowSummary.nextAction ?? "No workflow action pending."}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {activeWorkflowRuns.length > 0 ? (
              activeWorkflowRuns.slice(0, 4).map((run) => (
                <WorkflowRunCard
                  key={run.id}
                  run={run}
                  templateName={getWorkflowTemplateById(run.templateId)?.name ?? run.templateId}
                  progress={workflowProgressByRunId[run.id] ?? null}
                  reviewRequest={reviewRequestByRunId[run.id] ?? null}
                  compact
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5 xl:col-span-2">
                <p className="text-sm text-muted">No workflow runs are active yet. Launch one from the workflow builder to start packaging multi-agent work.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Distribution Command Layer</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Distribution queue, publishing readiness, and live deployment posture
              </h2>
            </div>
            <div className="status-pill border-electric/20 bg-electric/10 text-electric">{distributionJobs.length} jobs</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Distribution queue</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {distributionSummary.readyJobs + distributionJobs.filter((job) => job.status === "draft").length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Scheduled posts</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{scheduledDistributionJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Publishing failures</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{failedDistributionJobs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Live deployment status</p>
              <p className="mt-2 text-sm leading-6 text-muted">{liveDeploymentStatus}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="field-label">Publishing readiness</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Mock fallback: {distributionReadiness.mockFallbackEnabled ? "active" : "off"} / Manual handoff:{" "}
                  {distributionReadiness.manualFallbackEnabled ? "active" : "off"} / API-ready jobs:{" "}
                  {distributionReadiness.apiReadyJobs}
                </p>
              </div>
              <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
                {reviewRequiredDistributionJobs.length} review-required
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {distributionJobs.length > 0 ? (
              distributionJobs.slice(0, 4).map((job) => (
                <DistributionJobCard
                  key={job.id}
                  job={job}
                  reviewRequest={distributionReviewRequestByJobId[job.id] ?? null}
                  compact
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5 xl:col-span-2">
                <p className="text-sm text-muted">No distribution jobs are active yet. Send a promotion package into distribution to start the deployment queue.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="mt-5">
        <ExecutionPanel tasks={tasks} packages={executionPackages} results={executionResults} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Realtime Readiness</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Subscription posture across the command room</h2>
            </div>
            <div className="status-pill border-electric/20 bg-electric/10 text-electric">
              {realtimeSnapshot.readiness.provider.replaceAll("_", " ")}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {realtimeSnapshot.readiness.subscriptions.map((subscription) => (
              <div key={subscription.key} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{subscription.label}</p>
                    <p className="mt-2 text-sm text-muted">{subscription.channel}</p>
                  </div>
                  <div className="status-pill">{subscription.provider.replaceAll("_", " ")}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Realtime Task Feed</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Live workflow status and task movement</h2>
            </div>
            <div className="status-pill">{realtimeSnapshot.taskFeed.length} events</div>
          </div>

          <div className="mt-6 space-y-3">
            {realtimeSnapshot.taskFeed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm text-muted">{item.source}</p>
                  </div>
                  <div className="status-pill capitalize">{item.status.replaceAll("_", " ")}</div>
                </div>
                <p className="mt-3 text-xs text-foreground/70">{item.updatedAt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5">
        <QueuePanel snapshot={queues} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <ReviewPanel items={reviewQueue} />
        <FailurePanel failures={failures} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <NextActionsPanel
          actions={nextActions}
          workflowSummary={{
            activeRuns: workflowSummary.activeRuns,
            stuckRuns: workflowSummary.stuckRuns,
            needsReviewRuns: workflowSummary.needsReviewRuns,
            nextAction: workflowSummary.nextAction,
            nextActionHref: nextWorkflowRun ? `/workflows/${nextWorkflowRun.id}` : null,
            nextRunLabel: nextWorkflowRun
              ? getWorkflowTemplateById(nextWorkflowRun.templateId)?.name ?? nextWorkflowRun.templateId
              : null,
          }}
        />
        <ActivityFeed items={recentActivity} badge="Team activity" />
      </section>
    </AppShell>
  );
}
