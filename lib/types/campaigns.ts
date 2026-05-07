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
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  channels: CampaignChannel[];
  assignedMediaIds: string[];
  assignedAgentId: string;
  targetAudience: string;
  coreMessage: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
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
