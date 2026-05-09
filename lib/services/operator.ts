import { agentRegistry } from "@/lib/agents/registry";
import { getRecentActivity } from "@/lib/services/activity";
import { getAgentTasks } from "@/lib/services/agent-tasks";
import { getCampaigns } from "@/lib/services/campaigns";
import { getDistributionJobs } from "@/lib/services/distribution";
import { getMediaAssets } from "@/lib/services/media-storage";
import { getPromotionPackages } from "@/lib/services/promotions";
import { getPendingReviews } from "@/lib/services/reviews";
import { getWorkflowProgress, getWorkflowRuns, getWorkflowTemplateById } from "@/lib/services/workflows";
import { campaignStatuses } from "@/lib/types/campaigns";
import { distributionStatuses } from "@/lib/types/distribution";
import { promotionStatuses } from "@/lib/types/promotions";
import type { ActivitySeverity, ActivityType } from "@/lib/types/activity";
import { agentTaskStatuses } from "@/lib/types/agents";
import type { AgentTaskRecord, AgentTaskStatus } from "@/lib/types/agents";
import type { CampaignStatus } from "@/lib/types/campaigns";
import type { PromotionStatus } from "@/lib/types/promotions";

export interface OperatorMetrics {
  totalAgentTasks: number;
  queuedTasks: number;
  executingTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalGenerations: number;
  readyMediaAssets: number;
  activeCampaigns: number;
  preparedPromotions: number;
  distributionJobs: number;
  scheduledDistributionJobs: number;
  publishedDistributionJobs: number;
  downloadsToday: number;
}

export interface QueueStatusCount<TStatus extends string> {
  key: TStatus;
  label: string;
  count: number;
}

export interface QueueSnapshot {
  agentTasks: QueueStatusCount<AgentTaskStatus>[];
  campaigns: QueueStatusCount<CampaignStatus>[];
  promotions: QueueStatusCount<PromotionStatus>[];
  distribution: QueueStatusCount<(typeof distributionStatuses)[number]>[];
}

export interface FailureSnapshotItem {
  id: string;
  entityType: "agent_task" | "media_asset" | "campaign" | "promotion_package" | "distribution_job" | "system";
  entityId: string;
  title: string;
  description: string;
  status: string;
  severity: ActivitySeverity;
  owner: string;
  updatedAt: string;
}

export interface ReviewQueueItem {
  id: string;
  entityType: "media_asset" | "campaign" | "promotion_package" | "workflow_run" | "execution_package" | "distribution_job";
  entityId: string;
  title: string;
  description: string;
  status: string;
  owner: string;
  createdAt: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  priority: "normal" | "high" | "urgent";
  source: string;
  href: string;
}

function toLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusCount<TStatus extends string>(statuses: readonly TStatus[], values: TStatus[]) {
  return statuses.map((status) => ({
    key: status,
    label: toLabel(status),
    count: values.filter((value) => value === status).length,
  }));
}

function isToday(dateValue: string) {
  return dateValue.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function getPreparedPromotionCount(statuses: PromotionStatus[]) {
  const preparedStatuses: PromotionStatus[] = [
    "prepared",
    "ready_for_review",
    "approved",
    "scheduled",
    "published",
  ];

  return statuses.filter((status) => preparedStatuses.includes(status)).length;
}

function getTaskSummary(task: AgentTaskRecord) {
  const prompt = typeof task.input.prompt === "string" ? task.input.prompt : null;

  if (prompt) {
    return prompt.length > 110 ? `${prompt.slice(0, 107)}...` : prompt;
  }

  if (task.taskType === "review_media") {
    return "Review the asset decision and operator notes before continuing downstream packaging.";
  }

  if (task.status === "failed") {
    return "This task failed in the contract layer and needs operator investigation before requeueing.";
  }

  return `Task contract: ${toLabel(task.taskType)}.`;
}

export function getOperatorMetrics(): OperatorMetrics {
  const tasks = getAgentTasks();
  const mediaAssets = getMediaAssets();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();
  const distributionJobs = getDistributionJobs();
  const recentActivity = getRecentActivity(50);

  return {
    totalAgentTasks: tasks.length,
    queuedTasks: tasks.filter((task) => task.status === "queued").length,
    executingTasks: tasks.filter((task) => task.status === "executing").length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    failedTasks: tasks.filter((task) => task.status === "failed").length,
    totalGenerations: mediaAssets.filter((asset) => asset.generationJobId !== null).length,
    readyMediaAssets: mediaAssets.filter((asset) => asset.status === "ready").length,
    activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
    preparedPromotions: getPreparedPromotionCount(promotionPackages.map((promotionPackage) => promotionPackage.status)),
    distributionJobs: distributionJobs.length,
    scheduledDistributionJobs: distributionJobs.filter((job) => job.status === "scheduled").length,
    publishedDistributionJobs: distributionJobs.filter((job) => job.status === "published").length,
    downloadsToday: recentActivity.filter(
      (event) => event.type === "media_downloaded" && isToday(event.createdAt),
    ).length,
  };
}

export function getQueueSnapshot(): QueueSnapshot {
  const tasks = getAgentTasks();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();
  const distributionJobs = getDistributionJobs();

  return {
    agentTasks: getStatusCount(agentTaskStatuses, tasks.map((task) => task.status)),
    campaigns: getStatusCount(campaignStatuses, campaigns.map((campaign) => campaign.status)),
    promotions: getStatusCount(promotionStatuses, promotionPackages.map((promotionPackage) => promotionPackage.status)),
    distribution: getStatusCount(distributionStatuses, distributionJobs.map((job) => job.status)),
  };
}

export function getFailureSnapshot(): FailureSnapshotItem[] {
  const tasks = getAgentTasks();
  const mediaAssets = getMediaAssets();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();
  const distributionJobs = getDistributionJobs();
  const systemErrors = getRecentActivity(50).filter((event) => event.type === "system_error");

  const failures: FailureSnapshotItem[] = [
    ...tasks
      .filter((task) => task.status === "failed")
      .map((task) => ({
        id: `failure_${task.id}`,
        entityType: "agent_task" as const,
        entityId: task.id,
        title: `${task.agentName} task failed`,
        description: getTaskSummary(task),
        status: task.status,
        severity: "error" as const,
        owner: task.agentName,
        updatedAt: task.updatedAt,
      })),
    ...mediaAssets
      .filter((asset) => asset.status === "failed")
      .map((asset) => ({
        id: `failure_${asset.id}`,
        entityType: "media_asset" as const,
        entityId: asset.id,
        title: `${asset.title} failed`,
        description: "Media asset needs a retry before it can re-enter campaign packaging.",
        status: asset.status,
        severity: "error" as const,
        owner: asset.assignedAgentId,
        updatedAt: asset.updatedAt,
      })),
    ...campaigns
      .filter((campaign) => campaign.status === "failed")
      .map((campaign) => ({
        id: `failure_${campaign.id}`,
        entityType: "campaign" as const,
        entityId: campaign.id,
        title: `${campaign.name} is blocked`,
        description: campaign.nextAction,
        status: campaign.status,
        severity: "warning" as const,
        owner: campaign.assignedAgentId,
        updatedAt: campaign.updatedAt,
      })),
    ...promotionPackages
      .filter((promotionPackage) => promotionPackage.status === "failed")
      .map((promotionPackage) => ({
        id: `failure_${promotionPackage.id}`,
        entityType: "promotion_package" as const,
        entityId: promotionPackage.id,
        title: `${promotionPackage.campaignId} promotion failed`,
        description: promotionPackage.checklist.find((item) => !item.completed)?.label ?? "Needs operator follow-up.",
        status: promotionPackage.status,
        severity: "error" as const,
        owner: promotionPackage.assignedAgentId,
        updatedAt: promotionPackage.updatedAt,
      })),
    ...distributionJobs
      .filter((job) => job.status === "failed")
      .map((job) => ({
        id: `failure_${job.id}`,
        entityType: "distribution_job" as const,
        entityId: job.id,
        title: `${job.channel.replaceAll("_", " ")} distribution failed`,
        description: job.errorMessage ?? "Publishing failed and needs operator follow-up.",
        status: job.status,
        severity: "error" as const,
        owner: job.assignedAgentId ?? "Distribution Engine",
        updatedAt: job.updatedAt,
      })),
    ...systemErrors.map((event) => ({
      id: `failure_${event.id}`,
      entityType: "system" as const,
      entityId: event.relatedEntityId,
      title: event.title,
      description: event.description,
      status: event.type,
      severity: event.severity,
      owner: event.actor,
      updatedAt: event.createdAt,
    })),
  ];

  return failures.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function getReviewQueue(): ReviewQueueItem[] {
  return getPendingReviews().map((request) => ({
    id: request.id,
    entityType: request.entityType,
    entityId: request.entityId,
    title: request.entityLabel,
    description: request.notes || request.entityDescription,
    status: request.status,
    owner: request.assignedReviewerId ?? "reviewer",
    createdAt: request.updatedAt,
  }));
}

function getSystemAction(activityType: ActivityType) {
  if (activityType === "system_error") {
    return {
      priority: "urgent" as const,
      href: "/agents",
    };
  }

  return {
    priority: "high" as const,
    href: "/operator",
  };
}

function getReviewHref(entityType: ReviewQueueItem["entityType"]) {
  if (entityType === "media_asset") {
    return "/media";
  }

  if (entityType === "campaign") {
    return "/campaigns";
  }

  if (entityType === "promotion_package") {
    return "/promotions";
  }

  if (entityType === "workflow_run") {
    return "/workflows";
  }

  if (entityType === "distribution_job") {
    return "/distribution";
  }

  return "/agents";
}

function getFailurePriority(severity: ActivitySeverity): RecommendedAction["priority"] {
  return severity === "error" ? "urgent" : "high";
}

function getWorkflowPriority(status: string): RecommendedAction["priority"] {
  if (status === "failed") {
    return "urgent";
  }

  if (status === "needs_review" || status === "paused") {
    return "high";
  }

  return "normal";
}

export function getNextRecommendedActions(): RecommendedAction[] {
  const failures = getFailureSnapshot();
  const reviewQueue = getReviewQueue();
  const campaigns = getCampaigns();
  const distributionJobs = getDistributionJobs();
  const workflowRuns = getWorkflowRuns();
  const warnings = getRecentActivity(20).filter(
    (event) => event.type === "system_warning" || event.type === "system_error",
  );
  const workflowActions = workflowRuns
    .map((run) => ({
      run,
      progress: getWorkflowProgress(run.id),
      templateName: getWorkflowTemplateById(run.templateId)?.name ?? run.templateId,
    }))
    .filter(
      (item): item is {
        run: (typeof workflowRuns)[number];
        progress: NonNullable<ReturnType<typeof getWorkflowProgress>>;
        templateName: string;
      } => item.progress !== null,
    )
    .filter((item) => ["ready", "running", "needs_review", "failed", "paused"].includes(item.run.status))
    .slice(0, 2);

  const actions: RecommendedAction[] = [
    ...failures.slice(0, 2).map((failure) => ({
      id: `action_${failure.id}`,
      title: `Resolve ${failure.entityType.replaceAll("_", " ")}`,
      description: failure.description,
      priority: getFailurePriority(failure.severity),
      source: failure.owner,
      href: "/operator",
    })),
    ...reviewQueue.slice(0, 2).map((item) => ({
      id: `action_${item.id}`,
      title: `Review ${item.title}`,
      description: item.description,
      priority: "high" as const,
      source: item.owner,
      href: getReviewHref(item.entityType),
    })),
    ...campaigns
      .filter((campaign) => campaign.status === "building" || campaign.status === "ready")
      .slice(0, 2)
      .map((campaign) => ({
        id: `action_${campaign.id}`,
        title: `Advance ${campaign.name}`,
      description: campaign.nextAction,
      priority: "normal" as const,
      source: "Campaign Builder Agent",
      href: "/campaigns",
    })),
    ...distributionJobs
      .filter((job) => job.status === "ready" || job.status === "failed" || job.metadata.requiresApproval === true)
      .slice(0, 2)
      .map((job) => ({
        id: `action_distribution_${job.id}`,
        title:
          job.metadata.requiresApproval === true
            ? `Approve ${job.channel.replaceAll("_", " ")} distribution`
            : job.status === "failed"
              ? `Recover ${job.channel.replaceAll("_", " ")} distribution`
              : `Deploy ${job.channel.replaceAll("_", " ")} distribution`,
        description:
          typeof job.metadata.approvalReason === "string" && job.metadata.approvalReason
            ? job.metadata.approvalReason
            : job.errorMessage ?? "Distribution job is ready for deployment or manual handoff.",
        priority:
          job.status === "failed"
            ? ("urgent" as const)
            : job.metadata.requiresApproval === true
              ? ("high" as const)
              : ("normal" as const),
        source: job.assignedAgentId ?? "Distribution Engine",
        href: "/distribution",
      })),
    ...workflowActions.map((item) => ({
      id: `action_workflow_${item.run.id}`,
      title: `Advance ${item.templateName}`,
      description: item.progress.nextAction,
      priority: getWorkflowPriority(item.run.status),
      source: item.progress.currentStepName ?? item.templateName,
      href: `/workflows/${item.run.id}`,
    })),
    ...warnings.slice(0, 1).map((event) => ({
      id: `action_${event.id}`,
      title: event.title,
      description: event.description,
      priority: getSystemAction(event.type).priority,
      source: event.actor,
      href: getSystemAction(event.type).href,
    })),
  ];

  return actions.slice(0, 6);
}

export function getSystemAvailabilitySummary() {
  const availableAgents = agentRegistry.filter((agent) => agent.status === "available").length;
  const busyAgents = agentRegistry.filter((agent) => agent.status === "busy").length;
  const offlineAgents = agentRegistry.filter((agent) => agent.status === "offline").length;

  return {
    totalAgents: agentRegistry.length,
    availableAgents,
    busyAgents,
    offlineAgents,
  };
}

// TODO: Back all operator metrics with Supabase queries once persistence is enabled.
// TODO: Stream queue, failure, and activity updates over realtime when the control room becomes live.
