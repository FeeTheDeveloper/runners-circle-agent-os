export const generationTypes = ["image", "video"] as const;
export type GenerationType = (typeof generationTypes)[number];

export const generationStatuses = ["queued", "processing", "completed", "failed"] as const;
export type GenerationStatus = (typeof generationStatuses)[number];

export const aspectRatios = ["1:1", "4:5", "9:16", "16:9"] as const;
export type AspectRatio = (typeof aspectRatios)[number];

export const imageGenerationProviders = ["mock", "openai"] as const;
export type ImageGenerationProvider = (typeof imageGenerationProviders)[number];

export const videoDurations = [5, 10, 15, 30] as const;
export type VideoDuration = (typeof videoDurations)[number];

export const videoFormats = ["vertical", "square", "horizontal"] as const;
export type VideoFormat = (typeof videoFormats)[number];

export const videoGenerationProviders = ["mock", "openai", "external_renderer"] as const;
export type VideoGenerationProvider = (typeof videoGenerationProviders)[number];

export const videoJobStatuses = [
  "queued",
  "processing",
  "rendering",
  "uploading",
  "completed",
  "failed",
  "cancelled",
] as const;
export type VideoJobStatus = (typeof videoJobStatuses)[number];

export interface ImageGenerationInput {
  prompt: string;
  style: string;
  aspectRatio: AspectRatio;
  brandMode: boolean;
  agentId: string;
}

export interface VideoGenerationInput {
  prompt: string;
  motionStyle: string;
  duration: VideoDuration;
  format: VideoFormat;
  brandMode: boolean;
  agentId: string;
}

export interface GenerationResult {
  id: string;
  type: GenerationType;
  title: string;
  prompt: string;
  status: GenerationStatus;
  thumbnailUrl: string;
  mediaUrl: string;
  createdAt: string;
  assignedAgentId: string;
  pendingUpload: boolean;
  storageBucket: string | null;
  storagePath: string | null;
  finalizeRequired: boolean;
  provider: ImageGenerationProvider;
  storageReady: boolean;
  persisted: boolean;
  assetId?: string | null;
  revisedPrompt?: string | null;
}

export type GenerationErrorCode = "VALIDATION_ERROR" | "INVALID_AGENT_TASK" | "INTERNAL_ERROR";

export interface GenerationSuccess<T> {
  success: true;
  data: T;
}

export interface GenerationError {
  success: false;
  error: {
    message: string;
    code: GenerationErrorCode;
  };
}

export type GenerationResponse<T> = GenerationSuccess<T> | GenerationError;

export interface VideoGenerationJobMetadata {
  externalJobId?: string | null;
  renderStartedAt?: string | null;
  renderCompletedAt?: string | null;
  outputContentType?: string | null;
  outputFileName?: string | null;
  source?: "supabase" | "mock";
  [key: string]: unknown;
}

export interface VideoGenerationJob {
  id: string;
  userId: string;
  prompt: string;
  motionStyle: string;
  duration: VideoDuration;
  format: VideoFormat;
  brandMode: boolean;
  provider: VideoGenerationProvider;
  status: VideoJobStatus;
  progress: number;
  outputMediaAssetId: string | null;
  thumbnailMediaAssetId: string | null;
  assignedAgentId: string;
  errorMessage: string | null;
  metadata: VideoGenerationJobMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface VideoGenerationJobSummary {
  id: string;
  status: VideoJobStatus;
  progress: number;
}

export interface VideoGenerationJobAcceptedResponse {
  success: true;
  data: {
    job: VideoGenerationJobSummary;
    nextStep: string;
  };
}

export interface VideoGenerationJobDetailResponse {
  success: true;
  data: {
    job: VideoGenerationJob;
  };
}

export type VideoGenerationJobResponse =
  | VideoGenerationJobAcceptedResponse
  | VideoGenerationJobDetailResponse
  | GenerationError;
