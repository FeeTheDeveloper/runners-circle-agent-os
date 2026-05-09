import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import { createActivityEvent } from "@/lib/services/activity";
import { getExecutionPackage } from "@/lib/services/agent-execution";
import { getCampaignById } from "@/lib/services/campaigns";
import { getDistributionJobById } from "@/lib/services/distribution";
import { getMediaAssetById } from "@/lib/services/media-storage";
import { getPromotionPackageById } from "@/lib/services/promotions";
import { getWorkflowRunById } from "@/lib/services/workflows";
import type { ApprovalRequest, ApprovalEntityType, CreateApprovalRequestInput, ReviewStatus } from "@/lib/types/team";

export interface ApprovalRequestSummary extends ApprovalRequest {
  entityLabel: string;
  entityDescription: string;
  href: string;
}

const approvalRequestsStore: ApprovalRequest[] = [
  {
    id: "approval_campaign_001",
    teamId: DEFAULT_MOCK_TEAM_ID,
    entityType: "campaign",
    entityId: "campaign_001",
    requestedBy: "mock-user",
    assignedReviewerId: "reviewer@runnerscircle.local",
    status: "pending_review",
    notes: "Verify launch sequencing, CTA discipline, and channel pacing before promotion handoff.",
    createdAt: "2026-05-06T15:32:00.000Z",
    updatedAt: "2026-05-06T15:32:00.000Z",
  },
  {
    id: "approval_promotion_001",
    teamId: DEFAULT_MOCK_TEAM_ID,
    entityType: "promotion_package",
    entityId: "promotion_001",
    requestedBy: "mock-user",
    assignedReviewerId: "reviewer@runnerscircle.local",
    status: "pending_review",
    notes: "Approve the outbound caption pack before scheduling.",
    createdAt: "2026-05-06T15:18:00.000Z",
    updatedAt: "2026-05-06T15:18:00.000Z",
  },
  {
    id: "approval_media_006",
    teamId: DEFAULT_MOCK_TEAM_ID,
    entityType: "media_asset",
    entityId: "media_006",
    requestedBy: "mock-user",
    assignedReviewerId: "reviewer@runnerscircle.local",
    status: "changes_requested",
    notes: "Motion asset needs a cleaner recovery loop before this can re-enter campaign packaging.",
    createdAt: "2026-05-05T19:10:00.000Z",
    updatedAt: "2026-05-05T19:26:00.000Z",
  },
  {
    id: "approval_media_001",
    teamId: DEFAULT_MOCK_TEAM_ID,
    entityType: "media_asset",
    entityId: "media_001",
    requestedBy: "mock-user",
    assignedReviewerId: "reviewer@runnerscircle.local",
    status: "approved",
    notes: "Hero asset is approved for launch packaging.",
    createdAt: "2026-05-06T14:20:00.000Z",
    updatedAt: "2026-05-06T14:24:00.000Z",
  },
  {
    id: "approval_distribution_003",
    teamId: DEFAULT_MOCK_TEAM_ID,
    entityType: "distribution_job",
    entityId: "distribution_003",
    requestedBy: "mock-user",
    assignedReviewerId: "reviewer@runnerscircle.local",
    status: "pending_review",
    notes: "Publishing approval required before the YouTube Shorts package can move into deployment.",
    createdAt: "2026-05-06T15:22:00.000Z",
    updatedAt: "2026-05-06T15:22:00.000Z",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function createApprovalRequestId() {
  return `approval_${crypto.randomUUID().slice(0, 8)}`;
}

function cloneApprovalRequest(request: ApprovalRequest): ApprovalRequest {
  return { ...request };
}

function defaultReviewerId() {
  return "reviewer@runnerscircle.local";
}

function resolveEntitySummary(entityType: ApprovalEntityType, entityId: string) {
  if (entityType === "media_asset") {
    const asset = getMediaAssetById(entityId);

    return {
      entityLabel: asset?.title ?? entityId,
      entityDescription: asset ? asset.prompt : "Media asset review request.",
      href: "/media",
      teamId: asset?.teamId ?? DEFAULT_MOCK_TEAM_ID,
    };
  }

  if (entityType === "campaign") {
    const campaign = getCampaignById(entityId);

    return {
      entityLabel: campaign?.name ?? entityId,
      entityDescription: campaign?.nextAction ?? "Campaign review request.",
      href: "/campaigns",
      teamId: campaign?.teamId ?? DEFAULT_MOCK_TEAM_ID,
    };
  }

  if (entityType === "promotion_package") {
    const promotionPackage = getPromotionPackageById(entityId);

    return {
      entityLabel: promotionPackage?.campaignId ?? entityId,
      entityDescription: promotionPackage?.captionSet.instagramCaption ?? "Promotion package review request.",
      href: "/promotions",
      teamId: promotionPackage?.teamId ?? DEFAULT_MOCK_TEAM_ID,
    };
  }

  if (entityType === "workflow_run") {
    const workflowRun = getWorkflowRunById(entityId);

    return {
      entityLabel: workflowRun?.templateId ?? entityId,
      entityDescription:
        typeof workflowRun?.input.brief === "string" ? workflowRun.input.brief : "Workflow review request.",
      href: workflowRun ? `/workflows/${workflowRun.id}` : "/workflows",
      teamId: workflowRun?.teamId ?? DEFAULT_MOCK_TEAM_ID,
    };
  }

  if (entityType === "distribution_job") {
    const distributionJob = getDistributionJobById(entityId);

    return {
      entityLabel: distributionJob ? `${distributionJob.channel.replaceAll("_", " ")} distribution job` : entityId,
      entityDescription:
        distributionJob?.caption ?? "Distribution job approval request.",
      href: "/distribution",
      teamId: distributionJob?.teamId ?? DEFAULT_MOCK_TEAM_ID,
    };
  }

  const executionPackage = getExecutionPackage(entityId);

  return {
    entityLabel: executionPackage?.agentName ?? entityId,
    entityDescription: executionPackage?.instructionPrompt ?? "Execution package review request.",
    href: "/agents",
    teamId: executionPackage?.teamId ?? DEFAULT_MOCK_TEAM_ID,
  };
}

function setEntityReviewState(request: ApprovalRequest) {
  if (request.entityType === "media_asset") {
    const asset = getMediaAssetById(request.entityId);

    if (asset) {
      asset.reviewStatus = request.status;
      asset.assignedReviewerId = request.assignedReviewerId;
    }

    return;
  }

  if (request.entityType === "campaign") {
    const campaign = getCampaignById(request.entityId);

    if (campaign) {
      campaign.reviewStatus = request.status;
      campaign.assignedReviewerId = request.assignedReviewerId;
    }

    return;
  }

  if (request.entityType === "promotion_package") {
    const promotionPackage = getPromotionPackageById(request.entityId);

    if (promotionPackage) {
      promotionPackage.reviewStatus = request.status;
      promotionPackage.assignedReviewerId = request.assignedReviewerId;
    }

    return;
  }

  if (request.entityType === "execution_package") {
    const executionPackage = getExecutionPackage(request.entityId);

    if (executionPackage) {
      executionPackage.reviewStatus = request.status;
      executionPackage.assignedReviewerId = request.assignedReviewerId;
    }
  }
}

function updateApprovalRequestStatus(requestId: string, status: ReviewStatus, notes: string) {
  const request = approvalRequestsStore.find((entry) => entry.id === requestId);

  if (!request) {
    return null;
  }

  request.status = status;
  request.notes = notes.trim() || request.notes;
  request.updatedAt = nowIso();
  setEntityReviewState(request);

  return request;
}

export function getApprovalRequests(filters?: {
  status?: ReviewStatus;
  teamId?: string | null;
  entityType?: ApprovalEntityType;
  assignedReviewerId?: string | null;
}) {
  return approvalRequestsStore
    .filter((request) => (filters?.status ? request.status === filters.status : true))
    .filter((request) => (filters?.teamId ? request.teamId === filters.teamId : true))
    .filter((request) => (filters?.entityType ? request.entityType === filters.entityType : true))
    .filter((request) =>
      filters?.assignedReviewerId ? request.assignedReviewerId === filters.assignedReviewerId : true,
    )
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map(cloneApprovalRequest);
}

export function getApprovalRequestSummaries(filters?: {
  status?: ReviewStatus;
  teamId?: string | null;
  entityType?: ApprovalEntityType;
  assignedReviewerId?: string | null;
}) {
  return getApprovalRequests(filters).map((request) => {
    const summary = resolveEntitySummary(request.entityType, request.entityId);

    return {
      ...request,
      entityLabel: summary.entityLabel,
      entityDescription: summary.entityDescription,
      href: summary.href,
    } satisfies ApprovalRequestSummary;
  });
}

export function getLatestApprovalRequestForEntity(entityType: ApprovalEntityType, entityId: string) {
  return approvalRequestsStore
    .filter((request) => request.entityType === entityType && request.entityId === entityId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}

export function createApprovalRequest(input: CreateApprovalRequestInput) {
  const latestRequest = getLatestApprovalRequestForEntity(input.entityType, input.entityId);

  if (latestRequest && latestRequest.status === "pending_review") {
    return cloneApprovalRequest(latestRequest);
  }

  const entitySummary = resolveEntitySummary(input.entityType, input.entityId);
  const timestamp = nowIso();
  const request: ApprovalRequest = {
    id: createApprovalRequestId(),
    teamId: input.teamId ?? entitySummary.teamId ?? DEFAULT_MOCK_TEAM_ID,
    entityType: input.entityType,
    entityId: input.entityId,
    requestedBy: input.requestedBy,
    assignedReviewerId: input.assignedReviewerId ?? defaultReviewerId(),
    status: "pending_review",
    notes: input.notes?.trim() || `Review requested for ${entitySummary.entityLabel}.`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  approvalRequestsStore.unshift(request);
  setEntityReviewState(request);
  createActivityEvent({
    type: "review_requested",
    severity: "info",
    title: `${entitySummary.entityLabel} sent to review`,
    description: request.notes,
    relatedEntityType: input.entityType,
    relatedEntityId: input.entityId,
    actor: input.requestedBy,
  });

  return cloneApprovalRequest(request);
}

export function approveRequest(requestId: string, notes = "Approved for the next command-layer step.") {
  const request = updateApprovalRequestStatus(requestId, "approved", notes);

  if (!request) {
    return null;
  }

  const summary = resolveEntitySummary(request.entityType, request.entityId);
  createActivityEvent({
    type: "review_approved",
    severity: "success",
    title: `${summary.entityLabel} approved`,
    description: request.notes,
    relatedEntityType: request.entityType,
    relatedEntityId: request.entityId,
    actor: request.assignedReviewerId ?? "reviewer",
  });

  return cloneApprovalRequest(request);
}

export function rejectRequest(requestId: string, notes = "Rejected pending revision.") {
  const request = updateApprovalRequestStatus(requestId, "rejected", notes);

  if (!request) {
    return null;
  }

  const summary = resolveEntitySummary(request.entityType, request.entityId);
  createActivityEvent({
    type: "review_rejected",
    severity: "warning",
    title: `${summary.entityLabel} rejected`,
    description: request.notes,
    relatedEntityType: request.entityType,
    relatedEntityId: request.entityId,
    actor: request.assignedReviewerId ?? "reviewer",
  });

  return cloneApprovalRequest(request);
}

export function requestChanges(requestId: string, notes = "Changes requested before approval.") {
  const request = updateApprovalRequestStatus(requestId, "changes_requested", notes);

  if (!request) {
    return null;
  }

  const summary = resolveEntitySummary(request.entityType, request.entityId);
  createActivityEvent({
    type: "review_changes_requested",
    severity: "warning",
    title: `${summary.entityLabel} needs changes`,
    description: request.notes,
    relatedEntityType: request.entityType,
    relatedEntityId: request.entityId,
    actor: request.assignedReviewerId ?? "reviewer",
  });

  return cloneApprovalRequest(request);
}

export function getPendingReviews(teamId?: string | null) {
  return getApprovalRequestSummaries({
    status: "pending_review",
    teamId: teamId ?? undefined,
  });
}
