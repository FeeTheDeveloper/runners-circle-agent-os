import type { ReviewStatus } from "@/lib/types/team";

export const mediaTypes = ["image", "video"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const mediaStatuses = ["generated", "processing", "ready", "archived", "failed"] as const;
export type MediaStatus = (typeof mediaStatuses)[number];

export type MediaPersistenceSource = "mock" | "supabase";

export interface MediaAssetMetadata {
  campaignId?: string | null;
  contentType?: string | null;
  fileName?: string | null;
  pendingUpload?: boolean;
  finalizeRequired?: boolean;
  originalPrompt?: string;
  enhancedPrompt?: string;
  brandProfileId?: string | null;
  brandProfileName?: string | null;
  brandTone?: string | null;
  brandModeApplied?: boolean;
  brandWarnings?: string[];
  source?: MediaPersistenceSource;
  [key: string]: unknown;
}

export interface MediaAsset {
  id: string;
  externalId?: string | null;
  userId: string;
  teamId?: string | null;
  type: MediaType;
  title: string;
  prompt: string;
  thumbnailUrl: string;
  mediaUrl: string;
  storageBucket: string | null;
  storagePath: string | null;
  thumbnailBucket: string | null;
  thumbnailPath: string | null;
  status: MediaStatus;
  reviewStatus?: ReviewStatus | null;
  assignedReviewerId?: string | null;
  assignedAgentId: string;
  generationJobId: string | null;
  campaignId: string | null;
  metadata: MediaAssetMetadata;
  createdAt: string;
  updatedAt: string;
  source: MediaPersistenceSource;
  usageSummary?: import("@/lib/types/billing").UsageCheckResult | null;
}

export interface DownloadEvent {
  id: string;
  mediaAssetId: string;
  userId: string;
  downloadedAt: string;
  fileName: string;
  fileType: string;
}

export interface CreateMediaAssetInput {
  type: MediaType;
  title: string;
  prompt: string;
  thumbnailUrl: string;
  mediaUrl: string;
  userId?: string | null;
  teamId?: string | null;
  status?: MediaStatus;
  assignedAgentId: string;
  generationJobId?: string | null;
  campaignId?: string | null;
  metadata?: MediaAssetMetadata;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  fileName: string;
  expiresAt: string;
}

export interface UploadUrlResult {
  assetId: string;
  bucket: string;
  path: string;
  storagePath: string;
  signedUrl: string;
  uploadUrl: string;
  token: string | null;
  expiresAt: string;
}

export type MediaStorageKind = "media" | "thumbnail" | "campaign_export";

export interface BuildStoragePathInput {
  kind: MediaStorageKind;
  userId: string;
  assetId: string;
  mediaType?: MediaType;
  campaignId?: string;
}

export interface BuildStoragePathResult {
  bucket: string;
  path: string;
  fileName: string;
}

export interface SignedUploadUrlInput {
  userId: string;
  assetId: string;
  mediaType: MediaType;
}

export interface SignedDownloadUrlInput {
  bucket: string;
  path: string;
  fileName?: string;
  expiresInSeconds?: number;
}

export interface RegisterStoredMediaAssetInput {
  userId: string;
  teamId?: string | null;
  type: MediaType;
  title: string;
  prompt: string;
  assignedAgentId: string;
  assetId?: string;
  status?: MediaStatus;
  generationJobId?: string | null;
  campaignId?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  thumbnailBucket?: string | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  externalId?: string | null;
  metadata?: MediaAssetMetadata;
}

export interface FinalizeUploadedMediaAssetInput {
  assetId?: string;
  assetType: MediaType;
  title: string;
  prompt: string;
  storageBucket: string;
  storagePath: string;
  thumbnailBucket?: string | null;
  thumbnailPath?: string | null;
  contentType: string;
  fileName: string;
  assignedAgentId?: string | null;
  generationJobId?: string | null;
  externalId?: string | null;
  status?: MediaStatus;
  campaignId?: string | null;
}

export interface CreateMediaAssetRecordInput {
  userId: string;
  teamId?: string | null;
  assetId?: string;
  externalId?: string | null;
  type: MediaType;
  title: string;
  prompt: string;
  storageBucket: string | null;
  storagePath: string | null;
  thumbnailBucket?: string | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  contentType?: string | null;
  fileName?: string | null;
  assignedAgentId: string;
  generationJobId?: string | null;
  campaignId?: string | null;
  status?: MediaStatus;
  metadata?: MediaAssetMetadata;
}

export interface UpdateMediaAssetRecordInput {
  title?: string;
  prompt?: string;
  status?: MediaStatus;
  storageBucket?: string | null;
  storagePath?: string | null;
  thumbnailBucket?: string | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  contentType?: string | null;
  fileName?: string | null;
  assignedAgentId?: string;
  generationJobId?: string | null;
  campaignId?: string | null;
  externalId?: string | null;
  metadata?: MediaAssetMetadata;
}

export type MediaErrorCode =
  | "MEDIA_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "STORAGE_ERROR"
  | "INTERNAL_ERROR"
  | "UNAUTHORIZED";

export interface MediaDownloadSuccess {
  success: true;
  data: DownloadUrlResult;
}

export interface MediaUploadUrlSuccess {
  success: true;
  data: {
    asset: MediaAsset;
    upload: UploadUrlResult;
  };
}

export interface MediaFinalizeUploadSuccess {
  success: true;
  data: {
    mediaAsset: MediaAsset;
  };
}

export interface MediaDownloadError {
  success: false;
  error: {
    message: string;
    code: MediaErrorCode;
  };
}

export type MediaDownloadResponse = MediaDownloadSuccess | MediaDownloadError;
export type MediaUploadUrlResponse = MediaUploadUrlSuccess | MediaDownloadError;
export type MediaFinalizeUploadResponse = MediaFinalizeUploadSuccess | MediaDownloadError;
