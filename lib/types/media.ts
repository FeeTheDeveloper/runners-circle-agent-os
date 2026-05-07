export const mediaTypes = ["image", "video"] as const;
export type MediaType = (typeof mediaTypes)[number];

export const mediaStatuses = ["generated", "processing", "ready", "archived", "failed"] as const;
export type MediaStatus = (typeof mediaStatuses)[number];

export interface MediaAsset {
  id: string;
  type: MediaType;
  title: string;
  prompt: string;
  thumbnailUrl: string;
  mediaUrl: string;
  status: MediaStatus;
  assignedAgentId: string;
  generationJobId: string | null;
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
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
  status?: MediaStatus;
  assignedAgentId: string;
  generationJobId?: string | null;
  campaignId?: string | null;
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
  uploadUrl: string;
  token: string | null;
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
}

export type MediaErrorCode = "MEDIA_NOT_FOUND" | "VALIDATION_ERROR" | "STORAGE_ERROR" | "INTERNAL_ERROR";

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

export interface MediaDownloadError {
  success: false;
  error: {
    message: string;
    code: MediaErrorCode;
  };
}

export type MediaDownloadResponse = MediaDownloadSuccess | MediaDownloadError;
export type MediaUploadUrlResponse = MediaUploadUrlSuccess | MediaDownloadError;
