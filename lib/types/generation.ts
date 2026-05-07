export const generationTypes = ["image", "video"] as const;
export type GenerationType = (typeof generationTypes)[number];

export const generationStatuses = ["queued", "processing", "completed", "failed"] as const;
export type GenerationStatus = (typeof generationStatuses)[number];

export const aspectRatios = ["1:1", "4:5", "9:16", "16:9"] as const;
export type AspectRatio = (typeof aspectRatios)[number];

export const videoDurations = [5, 10, 15, 30] as const;
export type VideoDuration = (typeof videoDurations)[number];

export const videoFormats = ["vertical", "square", "horizontal"] as const;
export type VideoFormat = (typeof videoFormats)[number];

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
