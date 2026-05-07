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

export type MediaErrorCode = "MEDIA_NOT_FOUND" | "VALIDATION_ERROR" | "INTERNAL_ERROR";

export interface MediaDownloadSuccess {
  success: true;
  data: DownloadUrlResult;
}

export interface MediaDownloadError {
  success: false;
  error: {
    message: string;
    code: MediaErrorCode;
  };
}

export type MediaDownloadResponse = MediaDownloadSuccess | MediaDownloadError;
