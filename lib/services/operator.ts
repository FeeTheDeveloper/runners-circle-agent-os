import { agentRegistry } from "@/lib/agents/registry";
import { getRecentActivity } from "@/lib/services/activity";
import { getAgentTasks } from "@/lib/services/agent-tasks";
import { getCampaigns } from "@/lib/services/campaigns";
import { getMediaAssets } from "@/lib/services/media-storage";
import { getPromotionPackages } from "@/lib/services/promotions";
import { campaignStatuses } from "@/lib/types/campaigns";
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
}

export interface FailureSnapshotItem {
  id: string;
  entityType: "agent_task" | "media_asset" | "campaign" | "promotion_package" | "system";
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
  entityType: "agent_task" | "campaign" | "promotion_package";
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
    downloadsToday: recentActivity.filter(
      (event) => event.type === "media_downloaded" && isToday(event.createdAt),
    ).length,
  };
}

export function getQueueSnapshot(): QueueSnapshot {
  const tasks = getAgentTasks();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();

  return {
    agentTasks: getStatusCount(agentTaskStatuses, tasks.map((task) => task.status)),
    campaigns: getStatusCount(campaignStatuses, campaigns.map((campaign) => campaign.status)),
    promotions: getStatusCount(promotionStatuses, promotionPackages.map((promotionPackage) => promotionPackage.status)),
  };
}

export function getFailureSnapshot(): FailureSnapshotItem[] {
  const tasks = getAgentTasks();
  const mediaAssets = getMediaAssets();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();
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
  const tasks = getAgentTasks();
  const campaigns = getCampaigns();
  const promotionPackages = getPromotionPackages();

  const reviewItems: ReviewQueueItem[] = [
    ...tasks
      .filter((task) => task.status === "needs_review")
      .map((task) => ({
        id: `review_${task.id}`,
        entityType: "agent_task" as const,
        entityId: task.id,
        title: `${task.agentName} review required`,
        description: getTaskSummary(task),
        status: task.status,
        owner: task.agentName,
        createdAt: task.updatedAt,
      })),
    ...campaigns
      .filter((campaign) => campaign.status === "ready")
      .map((campaign) => ({
        id: `review_${campaign.id}`,
        entityType: "campaign" as const,
        entityId: campaign.id,
        title: `${campaign.name} ready for packaging`,
        description: campaign.nextAction,
        status: campaign.status,
        owner: campaign.assignedAgentId,
        createdAt: campaign.updatedAt,
      })),
    ...promotionPackages
      .filter((promotionPackage) => promotionPackage.status === "ready_for_review")
      .map((promotionPackage) => ({
        id: `review_${promotionPackage.id}`,
        entityType: "promotion_package" as const,
        entityId: promotionPackage.id,
        title: `${promotionPackage.campaignId} ready for review`,
        description: promotionPackage.captionSet.instagramCaption,
        status: promotionPackage.status,
        owner: promotionPackage.assignedAgentId,
        createdAt: promotionPackage.updatedAt,
      })),
  ];

  return reviewItems.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
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

function getFailurePriority(severity: ActivitySeverity): RecommendedAction["priority"] {
  return severity === "error" ? "urgent" : "high";
}

export function getNextRecommendedActions(): RecommendedAction[] {
  const failures = getFailureSnapshot();
  const reviewQueue = getReviewQueue();
  const campaigns = getCampaigns();
  const warnings = getRecentActivity(20).filter(
    (event) => event.type === "system_warning" || event.type === "system_error",
  );

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
      title: `Review ${item.entityType.replaceAll("_", " ")}`,
      description: item.description,
      priority: "high" as const,
      source: item.owner,
      href: item.entityType === "promotion_package" ? "/promotions" : "/operator",
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
