import type { BrandTone } from "@/lib/types/brand";
import type { ReviewStatus } from "@/lib/types/team";

export const campaignStatuses = ["draft", "building", "ready", "active", "paused", "completed", "failed"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const campaignChannels = ["instagram", "tiktok", "youtube_shorts", "x", "email", "website"] as const;
export type CampaignChannel = (typeof campaignChannels)[number];

export const campaignObjectives = [
  "awareness",
  "engagement",
  "lead_generation",
  "launch",
  "retargeting",
  "community_growth",
] as const;
export type CampaignObjective = (typeof campaignObjectives)[number];

export const campaignAssetStatuses = ["assigned", "planned", "ready", "blocked"] as const;
export type CampaignAssetStatus = (typeof campaignAssetStatuses)[number];

export interface Campaign {
  id: string;
  teamId?: string | null;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  reviewStatus?: ReviewStatus | null;
  assignedReviewerId?: string | null;
  channels: CampaignChannel[];
  assignedMediaIds: string[];
  assignedAgentId: string;
  targetAudience: string;
  coreMessage: string;
  nextAction: string;
  brandProfileId?: string | null;
  brandProfileName?: string | null;
  brandTone?: BrandTone | null;
  brandModeApplied?: boolean;
  createdAt: string;
  updatedAt: string;
  usageSummary?: import("@/lib/types/billing").UsageCheckResult | null;
}

export interface CampaignAsset {
  id: string;
  campaignId: string;
  mediaAssetId: string;
  role: string;
  channel: CampaignChannel;
  status: CampaignAssetStatus;
  createdAt: string;
}

export interface CampaignInput {
  name: string;
  objective: CampaignObjective;
  channels: CampaignChannel[];
  mediaAssetIds: string[];
  targetAudience: string;
  coreMessage: string;
  assignedAgentId: string;
  brandModeEnabled?: boolean;
  teamId?: string | null;
  userId?: string | null;
}

export type CampaignErrorCode =
  | "VALIDATION_ERROR"
  | "CAMPAIGN_NOT_FOUND"
  | "MEDIA_NOT_FOUND"
  | "INVALID_AGENT_TASK"
  | "MEDIA_ALREADY_ASSIGNED"
  | "INTERNAL_ERROR";

export interface CampaignSuccess<T> {
  success: true;
  data: T;
}

export interface CampaignError {
  success: false;
  error: {
    message: string;
    code: CampaignErrorCode;
  };
}

export type CampaignResponse<T> = CampaignSuccess<T> | CampaignError;
