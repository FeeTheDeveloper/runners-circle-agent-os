import type { BrandTone } from "@/lib/types/brand";
import type { ReviewStatus } from "@/lib/types/team";

export const promotionChannels = ["instagram", "tiktok", "youtube_shorts", "x", "email", "website"] as const;
export type PromotionChannel = (typeof promotionChannels)[number];

export const promotionStatuses = [
  "draft",
  "prepared",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "failed",
] as const;
export type PromotionStatus = (typeof promotionStatuses)[number];

export interface CaptionSet {
  instagramCaption: string;
  tiktokCaption: string;
  youtubeShortsTitle: string;
  youtubeShortsDescription: string;
  xPost: string;
  emailSubject: string;
  emailBody: string;
  websiteBlurb: string;
  hashtags: string[];
}

export interface PromotionChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface PromotionPackage {
  id: string;
  teamId?: string | null;
  campaignId: string;
  mediaAssetIds: string[];
  channels: PromotionChannel[];
  status: PromotionStatus;
  reviewStatus?: ReviewStatus | null;
  assignedReviewerId?: string | null;
  captionSet: CaptionSet;
  checklist: PromotionChecklistItem[];
  assignedAgentId: string;
  tone: string;
  callToAction: string;
  brandProfileId?: string | null;
  brandProfileName?: string | null;
  brandTone?: BrandTone | null;
  brandModeApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionInput {
  campaignId: string;
  mediaAssetIds: string[];
  channels: PromotionChannel[];
  tone: string;
  callToAction: string;
  assignedAgentId: string;
  brandModeEnabled?: boolean;
  teamId?: string | null;
  userId?: string | null;
}

export type PromotionErrorCode =
  | "VALIDATION_ERROR"
  | "CAMPAIGN_NOT_FOUND"
  | "MEDIA_NOT_FOUND"
  | "INVALID_AGENT_TASK"
  | "PACKAGE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface PromotionSuccess<T> {
  success: true;
  data: T;
}

export interface PromotionError {
  success: false;
  error: {
    message: string;
    code: PromotionErrorCode;
  };
}

export type PromotionResponse<T> = PromotionSuccess<T> | PromotionError;
