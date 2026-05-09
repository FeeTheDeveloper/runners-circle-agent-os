export const distributionChannels = [
  "instagram",
  "tiktok",
  "youtube_shorts",
  "x",
  "linkedin",
  "email",
  "website",
] as const;

export type DistributionChannel = (typeof distributionChannels)[number];

export const distributionStatuses = [
  "draft",
  "ready",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;

export type DistributionStatus = (typeof distributionStatuses)[number];

export const publishingProviders = ["mock", "manual", "api_ready", "future_live"] as const;
export type PublishingProvider = (typeof publishingProviders)[number];

export interface DistributionJob {
  id: string;
  teamId: string | null;
  campaignId: string;
  promotionPackageId: string;
  channel: DistributionChannel;
  provider: PublishingProvider;
  status: DistributionStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  publishedUrl: string | null;
  caption: string;
  mediaAssetIds: string[];
  assignedAgentId: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  usageSummary?: import("@/lib/types/billing").UsageCheckResult | null;
}

export interface CreateDistributionJobInput {
  teamId?: string | null;
  campaignId: string;
  promotionPackageId: string;
  channel: DistributionChannel;
  caption: string;
  mediaAssetIds: string[];
  assignedAgentId?: string | null;
  provider?: PublishingProvider;
  scheduledFor?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateDistributionJobsFromPromotionInput {
  promotionPackageId: string;
  channels?: DistributionChannel[];
  provider?: PublishingProvider;
  assignedAgentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DistributionJobFilters {
  teamId?: string | null;
  campaignId?: string | null;
  promotionPackageId?: string | null;
  channel?: DistributionChannel;
  status?: DistributionStatus;
}

export interface DistributionPayload {
  jobId: string;
  teamId: string | null;
  campaignId: string;
  promotionPackageId: string;
  channel: DistributionChannel;
  caption: string;
  mediaAssetIds: string[];
  scheduledFor: string | null;
  metadata: Record<string, unknown>;
}

export interface DistributionValidationResult {
  valid: boolean;
  issues: string[];
}

export interface DistributionPublishRequest {
  provider: PublishingProvider;
  endpoint: string | null;
  method: "POST";
  payload: Record<string, unknown>;
  manualSteps: string[];
}

export interface DistributionMockPublishResponse {
  ok: boolean;
  externalId: string;
  publishedUrl: string;
  publishedAt: string;
  notes: string;
}

export interface DistributionNormalizedResult {
  success: boolean;
  status: DistributionStatus;
  publishedAt: string | null;
  publishedUrl: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

export interface DistributionChannelAdapter {
  channel: DistributionChannel;
  validatePayload(payload: DistributionPayload): DistributionValidationResult;
  buildPublishRequest(payload: DistributionPayload, provider: PublishingProvider): DistributionPublishRequest;
  mockPublishResponse(payload: DistributionPayload): DistributionMockPublishResponse;
  normalizePublishResult(input: {
    provider: PublishingProvider;
    request: DistributionPublishRequest;
    response: DistributionMockPublishResponse | null;
    now: string;
  }): DistributionNormalizedResult;
}

export type DistributionErrorCode =
  | "VALIDATION_ERROR"
  | "PROMOTION_PACKAGE_NOT_FOUND"
  | "CAMPAIGN_NOT_FOUND"
  | "JOB_NOT_FOUND"
  | "REVIEW_REQUIRED"
  | "INVALID_STATUS"
  | "INTERNAL_ERROR";

export interface DistributionSuccess<T> {
  success: true;
  data: T;
}

export interface DistributionError {
  success: false;
  error: {
    message: string;
    code: DistributionErrorCode;
  };
}

export type DistributionResponse<T> = DistributionSuccess<T> | DistributionError;

export interface DistributionOperationalSummary {
  totalJobs: number;
  readyJobs: number;
  scheduledJobs: number;
  publishingJobs: number;
  publishedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  reviewRequiredJobs: number;
  mockJobs: number;
  manualJobs: number;
  apiReadyJobs: number;
}

export interface DistributionChannelBreakdownItem {
  channel: DistributionChannel;
  totalJobs: number;
  liveJobs: number;
  blockedJobs: number;
}

export interface DistributionReadinessSummary {
  manualFallbackEnabled: boolean;
  mockFallbackEnabled: boolean;
  apiReadyJobs: number;
  livePublishingEnabled: boolean;
  notes: string[];
}
