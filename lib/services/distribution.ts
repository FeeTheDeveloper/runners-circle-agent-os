import { mockDistributionJobs } from "@/lib/data/distribution";
import { createActivityEvent } from "@/lib/services/activity";
import { getCampaignById } from "@/lib/services/campaigns";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPromotionDistributionPayload, getPromotionPackageById } from "@/lib/services/promotions";
import { getCurrentUserTeams, getTeamRoleForUser } from "@/lib/services/teams";
import { checkUsageLimit, consumeUsageCredit, recordUsageEvent } from "@/lib/services/usage";
import { emailAdapter } from "@/lib/distribution/email";
import { instagramAdapter } from "@/lib/distribution/instagram";
import { linkedinAdapter } from "@/lib/distribution/linkedin";
import { tiktokAdapter } from "@/lib/distribution/tiktok";
import { websiteAdapter } from "@/lib/distribution/website";
import { xAdapter } from "@/lib/distribution/x";
import { youtubeShortsAdapter } from "@/lib/distribution/youtube-shorts";
import type {
  CreateDistributionJobInput,
  CreateDistributionJobsFromPromotionInput,
  DistributionChannel,
  DistributionChannelAdapter,
  DistributionChannelBreakdownItem,
  DistributionJob,
  DistributionJobFilters,
  DistributionOperationalSummary,
  DistributionReadinessSummary,
  DistributionResponse,
  PublishingProvider,
} from "@/lib/types/distribution";
import type { TeamRole } from "@/lib/types/team";

const distributionJobsStore = mockDistributionJobs.map((job) => ({
  ...job,
  mediaAssetIds: [...job.mediaAssetIds],
  metadata: { ...job.metadata },
}));

const channelAdapters: Record<DistributionChannel, DistributionChannelAdapter> = {
  instagram: instagramAdapter,
  tiktok: tiktokAdapter,
  youtube_shorts: youtubeShortsAdapter,
  x: xAdapter,
  linkedin: linkedinAdapter,
  email: emailAdapter,
  website: websiteAdapter,
};

function nowIso() {
  return new Date().toISOString();
}

function createDistributionJobId() {
  return `distribution_${crypto.randomUUID().slice(0, 8)}`;
}

function canManageDistribution(role: TeamRole | null) {
  return role !== null && ["owner", "admin", "operator", "editor"].includes(role);
}

function canOverrideDistributionApproval(role: TeamRole | null) {
  return role !== null && ["owner", "admin"].includes(role);
}

function cloneJob(job: DistributionJob): DistributionJob {
  return {
    ...job,
    mediaAssetIds: [...job.mediaAssetIds],
    metadata: structuredClone(job.metadata),
  };
}

function findJob(jobId: string) {
  return distributionJobsStore.find((job) => job.id === jobId) ?? null;
}

function toChannelLabel(channel: DistributionChannel) {
  return channel.replaceAll("_", " ");
}

function openJobExists(promotionPackageId: string, channel: DistributionChannel) {
  return distributionJobsStore.find(
    (job) =>
      job.promotionPackageId === promotionPackageId &&
      job.channel === channel &&
      !["failed", "cancelled"].includes(job.status),
  );
}

function createFailureAlert(job: DistributionJob, message: string) {
  createActivityEvent({
    type: "distribution_failed",
    severity: "error",
    title: `${toChannelLabel(job.channel)} distribution failed`,
    description: message,
    relatedEntityType: "distribution_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId ?? "Distribution Engine",
  });
  createActivityEvent({
    type: "system_warning",
    severity: "warning",
    title: `${toChannelLabel(job.channel)} publish needs operator attention`,
    description: message,
    relatedEntityType: "distribution_job",
    relatedEntityId: job.id,
    actor: "Operator Monitor",
  });
}

function resolveBaseMetadata(input: CreateDistributionJobInput, provider: PublishingProvider) {
  return {
    requiresApproval: false,
    approvalReason: null,
    liveCredentialsConfigured: false,
    liveIntegrationEnabled: false,
    providerMode: provider,
    ...structuredClone(input.metadata ?? {}),
  } satisfies Record<string, unknown>;
}

function createJobRecord(input: CreateDistributionJobInput): DistributionJob {
  const provider = input.provider ?? "manual";
  const timestamp = nowIso();
  const metadata = resolveBaseMetadata(input, provider);
  const scheduledFor = input.scheduledFor ?? null;
  const requiresApproval = metadata.requiresApproval === true;

  return {
    id: createDistributionJobId(),
    teamId: input.teamId ?? null,
    campaignId: input.campaignId,
    promotionPackageId: input.promotionPackageId,
    channel: input.channel,
    provider,
    status: scheduledFor ? "scheduled" : requiresApproval ? "draft" : "ready",
    scheduledFor,
    publishedAt: null,
    publishedUrl: null,
    caption: input.caption.trim(),
    mediaAssetIds: [...input.mediaAssetIds],
    assignedAgentId: input.assignedAgentId ?? null,
    errorMessage: null,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildJobInputFromPromotion(
  promotionPackageId: string,
  channel: DistributionChannel,
  options?: Omit<CreateDistributionJobsFromPromotionInput, "promotionPackageId">,
) {
  const promotionPackage = getPromotionPackageById(promotionPackageId);

  if (!promotionPackage) {
    return null;
  }

  const campaign = getCampaignById(promotionPackage.campaignId);
  const approvalRequired =
    (options?.metadata?.requireApproval as boolean | undefined) === true ||
    promotionPackage.reviewStatus !== "approved" ||
    !["approved", "scheduled", "published"].includes(promotionPackage.status);

  const approvalReason = approvalRequired
    ? typeof options?.metadata?.approvalReason === "string"
      ? options.metadata.approvalReason
      : "Promotion package has not been fully approved for publishing."
    : null;
  const metadata: Record<string, unknown> = {
    ...(options?.metadata ?? {}),
    requiresApproval: approvalRequired,
    approvalReason,
    captionSource:
      channel === "instagram"
        ? "instagramCaption"
        : channel === "tiktok"
          ? "tiktokCaption"
          : channel === "youtube_shorts"
            ? "youtubeShortsDescription"
            : channel === "x"
              ? "xPost"
              : channel === "linkedin"
                ? "xPost"
                : channel === "email"
                  ? "emailBody"
                  : "websiteBlurb",
    campaignName: campaign?.name ?? promotionPackage.campaignId,
    promotionStatus: promotionPackage.status,
    promotionReviewStatus: promotionPackage.reviewStatus,
    liveCredentialsConfigured: false,
    liveIntegrationEnabled: false,
  };
  const promotionPayload = getPromotionDistributionPayload(promotionPackage.id, channel);

  return {
    teamId: promotionPackage.teamId ?? null,
    campaignId: promotionPackage.campaignId,
    promotionPackageId: promotionPackage.id,
    channel,
    caption: promotionPayload?.caption ?? "",
    mediaAssetIds: [...promotionPackage.mediaAssetIds],
    assignedAgentId: options?.assignedAgentId ?? promotionPackage.assignedAgentId ?? "promotion-agent",
    provider: options?.provider ?? "manual",
    metadata,
  } satisfies CreateDistributionJobInput;
}

function updateJob(job: DistributionJob, update: Partial<DistributionJob>) {
  if (update.mediaAssetIds) {
    job.mediaAssetIds = [...update.mediaAssetIds];
  }

  if (update.metadata) {
    job.metadata = {
      ...job.metadata,
      ...structuredClone(update.metadata),
    };
  }

  if ("caption" in update && typeof update.caption === "string") {
    job.caption = update.caption;
  }

  if ("status" in update && update.status) {
    job.status = update.status;
  }

  if ("scheduledFor" in update) {
    job.scheduledFor = update.scheduledFor ?? null;
  }

  if ("publishedAt" in update) {
    job.publishedAt = update.publishedAt ?? null;
  }

  if ("publishedUrl" in update) {
    job.publishedUrl = update.publishedUrl ?? null;
  }

  if ("errorMessage" in update) {
    job.errorMessage = update.errorMessage ?? null;
  }

  if ("provider" in update && update.provider) {
    job.provider = update.provider;
  }

  job.updatedAt = nowIso();
}

export async function getDistributionActorContext(preferredTeamId?: string | null) {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const team =
    (preferredTeamId ? teams.find((entry) => entry.id === preferredTeamId) : null) ??
    teams[0] ??
    null;
  const teamRole = team ? await getTeamRoleForUser(team.id, userId) : null;

  return {
    currentProfile,
    userId,
    team,
    teamRole,
    canManage: canManageDistribution(teamRole),
    canPublish: canManageDistribution(teamRole),
    canOverrideApproval: canOverrideDistributionApproval(teamRole),
  };
}

export function createDistributionJob(
  input: CreateDistributionJobInput,
): DistributionResponse<{ distributionJob: DistributionJob }> {
  const promotionPackage = getPromotionPackageById(input.promotionPackageId);

  if (!promotionPackage) {
    return {
      success: false,
      error: {
        message: "Promotion package was not found.",
        code: "PROMOTION_PACKAGE_NOT_FOUND",
      },
    };
  }

  if (!getCampaignById(input.campaignId)) {
    return {
      success: false,
      error: {
        message: "Campaign was not found.",
        code: "CAMPAIGN_NOT_FOUND",
      },
    };
  }

  if (!input.caption.trim() || input.mediaAssetIds.length === 0) {
    return {
      success: false,
      error: {
        message: "Caption and media assets are required for distribution jobs.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  const existingJob = openJobExists(input.promotionPackageId, input.channel);

  if (existingJob) {
    return {
      success: true,
      data: {
        distributionJob: cloneJob(existingJob),
      },
    };
  }

  const userId =
    typeof input.metadata?.requestedByUserId === "string" && input.metadata.requestedByUserId.trim().length > 0
      ? input.metadata.requestedByUserId
      : "mock-user";
  const usageSummary = checkUsageLimit({
    userId,
    teamId: input.teamId ?? promotionPackage.teamId ?? null,
    type: "distribution_job",
  });
  const distributionJob = createJobRecord(input);
  distributionJob.usageSummary = usageSummary;
  distributionJobsStore.unshift(distributionJob);
  consumeUsageCredit({
    userId,
    teamId: distributionJob.teamId ?? null,
    type: "distribution_job",
  });
  recordUsageEvent({
    userId,
    teamId: distributionJob.teamId ?? null,
    type: "distribution_job",
    relatedEntityType: "distribution_job",
    relatedEntityId: distributionJob.id,
    metadata: {
      channel: distributionJob.channel,
      provider: distributionJob.provider,
      warning: usageSummary.warning,
    },
  });

  createActivityEvent({
    type: "distribution_job_created",
    severity: "info",
    title: `${toChannelLabel(distributionJob.channel)} distribution queued`,
    description: `Distribution packaging is ready for ${distributionJob.channel.replaceAll("_", " ")}.`,
    relatedEntityType: "distribution_job",
    relatedEntityId: distributionJob.id,
    actor: distributionJob.assignedAgentId ?? "Distribution Engine",
  });

  if (distributionJob.status === "scheduled" && distributionJob.scheduledFor) {
    createActivityEvent({
      type: "distribution_scheduled",
      severity: "info",
      title: `${toChannelLabel(distributionJob.channel)} distribution scheduled`,
      description: `Distribution job is scheduled for ${distributionJob.scheduledFor}.`,
      relatedEntityType: "distribution_job",
      relatedEntityId: distributionJob.id,
      actor: distributionJob.assignedAgentId ?? "Distribution Engine",
    });
  }

  return {
    success: true,
    data: {
      distributionJob: cloneJob(distributionJob),
    },
  };
}

export function createDistributionJobsFromPromotionPackage(
  input: CreateDistributionJobsFromPromotionInput,
): DistributionResponse<{ distributionJobs: DistributionJob[] }> {
  const promotionPackage = getPromotionPackageById(input.promotionPackageId);

  if (!promotionPackage) {
    return {
      success: false,
      error: {
        message: "Promotion package was not found.",
        code: "PROMOTION_PACKAGE_NOT_FOUND",
      },
    };
  }

  const channels = (input.channels?.length ? input.channels : promotionPackage.channels).filter(
    (channel, index, values) => values.indexOf(channel) === index,
  );
  const jobs: DistributionJob[] = [];

  for (const channel of channels) {
    const jobInput = buildJobInputFromPromotion(input.promotionPackageId, channel, input);

    if (!jobInput) {
      return {
        success: false,
        error: {
          message: "Promotion package was not found.",
          code: "PROMOTION_PACKAGE_NOT_FOUND",
        },
      };
    }

    const result = createDistributionJob(jobInput);

    if (!result.success) {
      return result;
    }

    jobs.push(result.data.distributionJob);
  }

  return {
    success: true,
    data: {
      distributionJobs: jobs,
    },
  };
}

export function getDistributionJobs(filters?: DistributionJobFilters) {
  return distributionJobsStore
    .filter((job) => (filters?.teamId ? job.teamId === filters.teamId : true))
    .filter((job) => (filters?.campaignId ? job.campaignId === filters.campaignId : true))
    .filter((job) => (filters?.promotionPackageId ? job.promotionPackageId === filters.promotionPackageId : true))
    .filter((job) => (filters?.channel ? job.channel === filters.channel : true))
    .filter((job) => (filters?.status ? job.status === filters.status : true))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map(cloneJob);
}

export function getDistributionJobById(jobId: string) {
  const job = findJob(jobId);
  return job ? cloneJob(job) : null;
}

export function scheduleDistributionJob(
  jobId: string,
  scheduledFor: string,
): DistributionResponse<{ distributionJob: DistributionJob }> {
  const job = findJob(jobId);

  if (!job) {
    return {
      success: false,
      error: {
        message: "Distribution job was not found.",
        code: "JOB_NOT_FOUND",
      },
    };
  }

  if (["published", "cancelled"].includes(job.status)) {
    return {
      success: false,
      error: {
        message: "This distribution job can no longer be scheduled.",
        code: "INVALID_STATUS",
      },
    };
  }

  updateJob(job, {
    status: "scheduled",
    scheduledFor,
    errorMessage: null,
  });

  createActivityEvent({
    type: "distribution_scheduled",
    severity: "info",
    title: `${toChannelLabel(job.channel)} distribution scheduled`,
    description: `Distribution job is scheduled for ${scheduledFor}.`,
    relatedEntityType: "distribution_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId ?? "Distribution Engine",
  });

  return {
    success: true,
    data: {
      distributionJob: cloneJob(job),
    },
  };
}

export function publishDistributionJob(
  jobId: string,
  options?: {
    approvalSatisfied?: boolean;
    overrideApproval?: boolean;
  },
): DistributionResponse<{ distributionJob: DistributionJob }> {
  const job = findJob(jobId);

  if (!job) {
    return {
      success: false,
      error: {
        message: "Distribution job was not found.",
        code: "JOB_NOT_FOUND",
      },
    };
  }

  if (job.status === "cancelled") {
    return {
      success: false,
      error: {
        message: "Cancelled distribution jobs cannot be published.",
        code: "INVALID_STATUS",
      },
    };
  }

  if (job.metadata.requiresApproval === true && !options?.approvalSatisfied && !options?.overrideApproval) {
    return {
      success: false,
      error: {
        message: "This distribution job still requires reviewer approval before publishing.",
        code: "REVIEW_REQUIRED",
      },
    };
  }

  const adapter = channelAdapters[job.channel];
  const payload = {
    jobId: job.id,
    teamId: job.teamId,
    campaignId: job.campaignId,
    promotionPackageId: job.promotionPackageId,
    channel: job.channel,
    caption: job.caption,
    mediaAssetIds: [...job.mediaAssetIds],
    scheduledFor: job.scheduledFor,
    metadata: structuredClone(job.metadata),
  };
  const validation = adapter.validatePayload(payload);

  if (!validation.valid) {
    updateJob(job, {
      status: "failed",
      errorMessage: validation.issues.join(" "),
      metadata: {
        lastValidationIssues: validation.issues,
      },
    });
    createFailureAlert(job, validation.issues.join(" "));

    return {
      success: false,
      error: {
        message: validation.issues[0] ?? "Distribution payload is invalid.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  createActivityEvent({
    type: "distribution_publishing",
    severity: "info",
    title: `${toChannelLabel(job.channel)} distribution publishing`,
    description:
      job.provider === "mock"
        ? "Mock publishing is executing for this channel."
        : "A manual or future live publish handoff has been prepared for this channel.",
    relatedEntityType: "distribution_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId ?? "Distribution Engine",
  });

  updateJob(job, {
    status: "publishing",
    errorMessage: null,
  });

  const request = adapter.buildPublishRequest(payload, job.provider);
  const response = job.provider === "mock" ? adapter.mockPublishResponse(payload) : null;
  const normalizedResult = adapter.normalizePublishResult({
    provider: job.provider,
    request,
    response,
    now: nowIso(),
  });

  if (!normalizedResult.success) {
    updateJob(job, {
      status: "failed",
      errorMessage: normalizedResult.errorMessage ?? "Publishing failed.",
      metadata: normalizedResult.metadata,
    });
    createFailureAlert(job, normalizedResult.errorMessage ?? "Publishing failed.");

    return {
      success: false,
      error: {
        message: normalizedResult.errorMessage ?? "Publishing failed.",
        code: "INTERNAL_ERROR",
      },
    };
  }

  updateJob(job, {
    status: normalizedResult.status,
    publishedAt: normalizedResult.publishedAt,
    publishedUrl: normalizedResult.publishedUrl,
    errorMessage: normalizedResult.errorMessage,
    metadata: normalizedResult.metadata,
  });

  if (job.provider === "mock" && job.status === "published") {
    createActivityEvent({
      type: "distribution_published",
      severity: "success",
      title: `${toChannelLabel(job.channel)} distribution published`,
      description: `Mock publishing completed and a normalized published URL was recorded for ${toChannelLabel(job.channel)}.`,
      relatedEntityType: "distribution_job",
      relatedEntityId: job.id,
      actor: job.assignedAgentId ?? "Distribution Engine",
    });
  }

  return {
    success: true,
    data: {
      distributionJob: cloneJob(job),
    },
  };
}

export function cancelDistributionJob(jobId: string): DistributionResponse<{ distributionJob: DistributionJob }> {
  const job = findJob(jobId);

  if (!job) {
    return {
      success: false,
      error: {
        message: "Distribution job was not found.",
        code: "JOB_NOT_FOUND",
      },
    };
  }

  updateJob(job, {
    status: "cancelled",
  });

  return {
    success: true,
    data: {
      distributionJob: cloneJob(job),
    },
  };
}

export function retryDistributionJob(jobId: string): DistributionResponse<{ distributionJob: DistributionJob }> {
  const job = findJob(jobId);

  if (!job) {
    return {
      success: false,
      error: {
        message: "Distribution job was not found.",
        code: "JOB_NOT_FOUND",
      },
    };
  }

  if (!["failed", "cancelled"].includes(job.status)) {
    return {
      success: false,
      error: {
        message: "Only failed or cancelled distribution jobs can be retried.",
        code: "INVALID_STATUS",
      },
    };
  }

  updateJob(job, {
    status: job.scheduledFor ? "scheduled" : "ready",
    errorMessage: null,
    publishedAt: null,
    publishedUrl: null,
    metadata: {
      lastRetryAt: nowIso(),
    },
  });

  return {
    success: true,
    data: {
      distributionJob: cloneJob(job),
    },
  };
}

export function getDistributionOperationalSummary(filters?: DistributionJobFilters): DistributionOperationalSummary {
  const jobs = getDistributionJobs(filters);

  return {
    totalJobs: jobs.length,
    readyJobs: jobs.filter((job) => job.status === "ready").length,
    scheduledJobs: jobs.filter((job) => job.status === "scheduled").length,
    publishingJobs: jobs.filter((job) => job.status === "publishing").length,
    publishedJobs: jobs.filter((job) => job.status === "published").length,
    failedJobs: jobs.filter((job) => job.status === "failed").length,
    cancelledJobs: jobs.filter((job) => job.status === "cancelled").length,
    reviewRequiredJobs: jobs.filter((job) => job.metadata.requiresApproval === true).length,
    mockJobs: jobs.filter((job) => job.provider === "mock").length,
    manualJobs: jobs.filter((job) => job.provider === "manual").length,
    apiReadyJobs: jobs.filter((job) => job.provider === "api_ready").length,
  };
}

export function getDistributionChannelBreakdown(filters?: DistributionJobFilters): DistributionChannelBreakdownItem[] {
  const scopedJobs = getDistributionJobs(filters);

  return Object.keys(channelAdapters).map((channel) => {
    const typedChannel = channel as DistributionChannel;
    const jobs = scopedJobs.filter((job) => job.channel === typedChannel);

    return {
      channel: typedChannel,
      totalJobs: jobs.length,
      liveJobs: jobs.filter((job) => ["scheduled", "publishing", "published"].includes(job.status)).length,
      blockedJobs: jobs.filter((job) => job.status === "failed" || job.metadata.requiresApproval === true).length,
    };
  });
}

export function getReviewRequiredDistributionJobs(filters?: DistributionJobFilters) {
  return getDistributionJobs(filters).filter((job) => job.metadata.requiresApproval === true);
}

export function getDistributionReadinessSummary(filters?: DistributionJobFilters): DistributionReadinessSummary {
  const jobs = getDistributionJobs(filters);
  const apiReadyJobs = jobs.filter((job) => job.provider === "api_ready").length;

  return {
    manualFallbackEnabled: jobs.some((job) => job.provider === "manual"),
    mockFallbackEnabled: jobs.some((job) => job.provider === "mock"),
    apiReadyJobs,
    livePublishingEnabled: false,
    notes: [
      "Manual and mock publishing modes are active until real provider integrations are implemented.",
      apiReadyJobs > 0
        ? "Some jobs are marked api-ready, but live external publishing still needs provider-specific server integrations."
        : "No provider-backed live publishing lane is active yet.",
    ],
  };
}
