import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createActivityEvent } from "@/lib/services/activity";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import { createMediaAssetRecord } from "@/lib/services/media-storage";
import { getCurrentProfile } from "@/lib/services/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, GenerationJobRow } from "@/lib/types/database";
import {
  videoDurations,
  videoFormats,
  type GenerationError,
  type GenerationResponse,
  type VideoDuration,
  type VideoFormat,
  type VideoGenerationInput,
  type VideoGenerationJob,
  type VideoGenerationJobMetadata,
  type VideoGenerationProvider,
  type VideoJobStatus,
} from "@/lib/types/generation";
import type { CreateMediaAssetRecordInput, MediaAsset } from "@/lib/types/media";

const DEFAULT_MOCK_USER_ID = "mock-user";
const inMemoryVideoJobs: VideoGenerationJob[] = [];

const MOCK_PROGRESSION: Array<{ status: VideoJobStatus; progress: number }> = [
  { status: "queued", progress: 0 },
  { status: "processing", progress: 15 },
  { status: "rendering", progress: 55 },
  { status: "uploading", progress: 85 },
  { status: "completed", progress: 100 },
];

function nowIso() {
  return new Date().toISOString();
}

function summarizePrompt(prompt: string) {
  return prompt.trim().split(/\s+/).slice(0, 5).join(" ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function createMockJobId() {
  return crypto.randomUUID();
}

function createMockThumbnail(title: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="52" fill="url(#bg)" />
      <rect x="64" y="64" width="1072" height="772" rx="42" fill="none" stroke="#00d4ff" stroke-opacity="0.42" />
      <circle cx="920" cy="230" r="150" fill="#00d4ff" fill-opacity="0.14" />
      <circle cx="280" cy="710" r="230" fill="#f97316" fill-opacity="0.14" />
      <polygon points="526,346 526,554 714,450" fill="#f5f5f4" fill-opacity="0.92" />
      <text x="86" y="170" fill="#f5f5f4" font-size="34" font-family="Arial, sans-serif" letter-spacing="8">RUNNERS CIRCLE</text>
      <text x="86" y="266" fill="#f5f5f4" font-size="78" font-weight="700" font-family="Arial, sans-serif">VIDEO JOB</text>
      <text x="86" y="352" fill="#d1fae5" font-size="28" font-family="Arial, sans-serif">${title}</text>
      <text x="86" y="790" fill="#67e8f9" font-size="24" font-family="Arial, sans-serif">Queued render contract preview only</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function asMetadata(value: unknown): VideoGenerationJobMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }

  return {};
}

function mapRowToVideoJob(row: GenerationJobRow): VideoGenerationJob {
  const input = (row.input_payload ?? {}) as Record<string, unknown>;
  const output = (row.output_payload ?? {}) as Record<string, unknown>;
  const metadata: VideoGenerationJobMetadata = {
    ...asMetadata(output.metadata),
    source: "supabase",
  };

  if (row.external_job_id) {
    metadata.externalJobId = row.external_job_id;
  }

  return {
    id: row.id,
    userId: row.user_id,
    prompt: typeof input.prompt === "string" ? input.prompt : "",
    motionStyle: typeof input.motionStyle === "string" ? input.motionStyle : "",
    duration: (typeof input.duration === "number"
      ? (input.duration as VideoDuration)
      : 15) as VideoDuration,
    format: ((typeof input.format === "string" ? input.format : "vertical") as VideoFormat),
    brandMode: input.brandMode === true,
    provider: ((row.provider ?? "mock") as VideoGenerationProvider),
    status: row.status as VideoJobStatus,
    progress: row.progress ?? 0,
    outputMediaAssetId: row.media_asset_id,
    thumbnailMediaAssetId:
      typeof output.thumbnailMediaAssetId === "string" ? output.thumbnailMediaAssetId : null,
    assignedAgentId: row.assigned_agent_id ?? "video-generation",
    errorMessage: row.error_message,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedSupabaseContext(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string;
} | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { supabase, userId: user.id };
  } catch {
    return null;
  }
}

function validateVideoInput(input: VideoGenerationInput): GenerationError | null {
  if (!input.prompt.trim() || !input.motionStyle.trim() || !input.agentId.trim()) {
    return {
      success: false,
      error: {
        message: "Prompt, motion style, and agent are required for video generation.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  if (!videoDurations.includes(input.duration) || !videoFormats.includes(input.format)) {
    return {
      success: false,
      error: {
        message: "Invalid video duration or format.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  const validation = validateAgentTask(input.agentId, "generate_video_prompt");

  if (!validation.valid) {
    return {
      success: false,
      error: {
        message: validation.message,
        code: validation.code,
      },
    };
  }

  return null;
}

function buildLocalJob(input: VideoGenerationInput, userId: string): VideoGenerationJob {
  const id = createMockJobId();
  const timestamp = nowIso();

  return {
    id,
    userId,
    prompt: input.prompt.trim(),
    motionStyle: input.motionStyle.trim(),
    duration: input.duration,
    format: input.format,
    brandMode: input.brandMode,
    provider: "mock",
    status: "queued",
    progress: 0,
    outputMediaAssetId: null,
    thumbnailMediaAssetId: null,
    assignedAgentId: input.agentId,
    errorMessage: null,
    metadata: { source: "mock" },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function logQueuedActivity(job: VideoGenerationJob) {
  createActivityEvent({
    type: "video_job_queued",
    severity: "info",
    title: `Video job queued · ${summarizePrompt(job.prompt)}`,
    description: `Provider ${job.provider}; format ${job.format}; ${job.duration}s.`,
    relatedEntityType: "generation_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId,
  });
}

function logRenderStarted(job: VideoGenerationJob) {
  createActivityEvent({
    type: "video_render_started",
    severity: "info",
    title: `Video render started · ${summarizePrompt(job.prompt)}`,
    description: `Provider ${job.provider} now in ${job.status} (${job.progress}%).`,
    relatedEntityType: "generation_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId,
  });
}

function logRenderCompleted(job: VideoGenerationJob) {
  createActivityEvent({
    type: "video_render_completed",
    severity: "success",
    title: `Video render completed · ${summarizePrompt(job.prompt)}`,
    description: job.outputMediaAssetId
      ? `Linked media asset ${job.outputMediaAssetId}.`
      : "Job completed without a linked media asset.",
    relatedEntityType: "generation_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId,
  });
}

function logRenderFailed(job: VideoGenerationJob) {
  createActivityEvent({
    type: "video_render_failed",
    severity: "error",
    title: `Video render failed · ${summarizePrompt(job.prompt)}`,
    description: job.errorMessage ?? "Job failed without a recorded error message.",
    relatedEntityType: "generation_job",
    relatedEntityId: job.id,
    actor: job.assignedAgentId,
  });
}

async function persistJobInsert(input: VideoGenerationInput, userId: string): Promise<VideoGenerationJob> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    const job = buildLocalJob(input, userId);
    inMemoryVideoJobs.unshift(job);
    return job;
  }

  const provider: VideoGenerationProvider = "mock";
  const inputPayload = {
    prompt: input.prompt.trim(),
    motionStyle: input.motionStyle.trim(),
    duration: input.duration,
    format: input.format,
    brandMode: input.brandMode,
  };

  const insertPayload = {
    user_id: auth.userId,
    agent_task_id: null,
    generation_type: "video" as const,
    status: "queued" as VideoJobStatus,
    provider,
    progress: 0,
    input_payload: inputPayload as unknown as Database["public"]["Tables"]["generation_jobs"]["Insert"]["input_payload"],
    output_payload: {} as Database["public"]["Tables"]["generation_jobs"]["Insert"]["output_payload"],
    external_job_id: null,
    external_id: null,
    error_message: null,
    media_asset_id: null,
    assigned_agent_id: input.agentId,
  };

  const { data, error } = await auth.supabase
    .from("generation_jobs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    const job = buildLocalJob(input, auth.userId);
    inMemoryVideoJobs.unshift(job);
    return job;
  }

  return mapRowToVideoJob(data as GenerationJobRow);
}

export async function createVideoGenerationJob(
  input: VideoGenerationInput,
): Promise<GenerationResponse<VideoGenerationJob>> {
  const validation = validateVideoInput(input);

  if (validation) {
    return validation;
  }

  const profile = await getCurrentProfile();
  const userId = profile.user?.id ?? profile.profile?.user_id ?? DEFAULT_MOCK_USER_ID;
  const job = await persistJobInsert(input, userId);

  logQueuedActivity(job);

  return { success: true, data: job };
}

export async function getVideoGenerationJob(
  userId: string,
  jobId: string,
): Promise<VideoGenerationJob | null> {
  const auth = await getAuthenticatedSupabaseContext();

  if (auth) {
    if (userId !== auth.userId) {
      return null;
    }

    const filterColumn = isUuid(jobId) ? "id" : "external_id";
    const { data, error } = await auth.supabase
      .from("generation_jobs")
      .select("*")
      .eq("user_id", auth.userId)
      .eq(filterColumn, jobId)
      .eq("generation_type", "video")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapRowToVideoJob(data as GenerationJobRow);
  }

  const job = inMemoryVideoJobs.find((entry) => entry.id === jobId);

  if (!job) {
    return null;
  }

  if (userId !== job.userId && job.userId !== DEFAULT_MOCK_USER_ID) {
    return null;
  }

  return job;
}

export async function getUserVideoGenerationJobs(userId: string): Promise<VideoGenerationJob[]> {
  const auth = await getAuthenticatedSupabaseContext();

  if (auth) {
    if (userId !== auth.userId) {
      return [];
    }

    const { data, error } = await auth.supabase
      .from("generation_jobs")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("generation_type", "video")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return (data as GenerationJobRow[]).map(mapRowToVideoJob);
  }

  return inMemoryVideoJobs
    .filter((job) => job.userId === userId || job.userId === DEFAULT_MOCK_USER_ID)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getAllVideoGenerationJobs(): VideoGenerationJob[] {
  return [...inMemoryVideoJobs].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

interface UpdateVideoJobOptions {
  errorMessage?: string | null;
  outputMediaAssetId?: string | null;
  thumbnailMediaAssetId?: string | null;
  metadata?: VideoGenerationJobMetadata;
}

export async function updateVideoJobStatus(
  jobId: string,
  status: VideoJobStatus,
  progress: number,
  options: UpdateVideoJobOptions = {},
): Promise<VideoGenerationJob | null> {
  const auth = await getAuthenticatedSupabaseContext();

  if (auth) {
    const filterColumn = isUuid(jobId) ? "id" : "external_id";
    const { data: existingRow, error: fetchError } = await auth.supabase
      .from("generation_jobs")
      .select("*")
      .eq(filterColumn, jobId)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (fetchError || !existingRow) {
      return null;
    }

    const existingOutput = (existingRow.output_payload ?? {}) as Record<string, unknown>;
    const mergedMetadata = {
      ...asMetadata(existingOutput.metadata),
      ...(options.metadata ?? {}),
    };

    const nextOutput: Record<string, unknown> = {
      ...existingOutput,
      metadata: mergedMetadata,
    };

    if (options.thumbnailMediaAssetId !== undefined) {
      nextOutput.thumbnailMediaAssetId = options.thumbnailMediaAssetId;
    }

    const updatePayload: Record<string, unknown> = {
      status,
      progress,
      output_payload: nextOutput,
    };

    if (options.errorMessage !== undefined) {
      updatePayload.error_message = options.errorMessage;
    }

    if (options.outputMediaAssetId !== undefined) {
      updatePayload.media_asset_id = options.outputMediaAssetId;
    }

    const { data, error } = await auth.supabase
      .from("generation_jobs")
      .update(updatePayload)
      .eq("id", existingRow.id)
      .eq("user_id", auth.userId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapRowToVideoJob(data as GenerationJobRow);
  }

  const job = inMemoryVideoJobs.find((entry) => entry.id === jobId);

  if (!job) {
    return null;
  }

  job.status = status;
  job.progress = progress;
  job.updatedAt = nowIso();

  if (options.errorMessage !== undefined) {
    job.errorMessage = options.errorMessage;
  }

  if (options.outputMediaAssetId !== undefined) {
    job.outputMediaAssetId = options.outputMediaAssetId;
  }

  if (options.thumbnailMediaAssetId !== undefined) {
    job.thumbnailMediaAssetId = options.thumbnailMediaAssetId;
  }

  if (options.metadata) {
    job.metadata = { ...job.metadata, ...options.metadata };
  }

  return job;
}

async function createMockOutputMediaAsset(job: VideoGenerationJob): Promise<MediaAsset | null> {
  const title = `Video · ${summarizePrompt(job.prompt)}`;
  const thumbnail = createMockThumbnail(title);

  const recordInput: CreateMediaAssetRecordInput = {
    userId: job.userId,
    type: "video",
    title,
    prompt: job.prompt,
    storageBucket: null,
    storagePath: null,
    thumbnailUrl: thumbnail,
    mediaUrl: thumbnail,
    contentType: "video/mp4",
    fileName: `${job.id}.mp4`,
    assignedAgentId: job.assignedAgentId,
    generationJobId: job.id,
    status: "ready",
    metadata: {
      provider: job.provider,
      videoJobId: job.id,
      videoFormat: job.format,
      videoDuration: job.duration,
      motionStyle: job.motionStyle,
      brandMode: job.brandMode,
      pendingUpload: true,
      finalizeRequired: true,
    },
  };

  try {
    return await createMediaAssetRecord(recordInput);
  } catch {
    return null;
  }
}

function nextMockState(current: VideoJobStatus): { status: VideoJobStatus; progress: number } {
  const index = MOCK_PROGRESSION.findIndex((step) => step.status === current);

  if (index < 0) {
    return MOCK_PROGRESSION[0];
  }

  if (index >= MOCK_PROGRESSION.length - 1) {
    return MOCK_PROGRESSION[MOCK_PROGRESSION.length - 1];
  }

  return MOCK_PROGRESSION[index + 1];
}

export async function processVideoGenerationJob(
  jobId: string,
): Promise<VideoGenerationJob | null> {
  const profile = await getCurrentProfile();
  const userId = profile.user?.id ?? profile.profile?.user_id ?? DEFAULT_MOCK_USER_ID;
  const job = await getVideoGenerationJob(userId, jobId);

  if (!job) {
    return null;
  }

  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return job;
  }

  const next = nextMockState(job.status);
  let outputMediaAssetId = job.outputMediaAssetId;
  const updateMetadata: VideoGenerationJobMetadata = {};

  if (next.status === "rendering" && job.status !== "rendering") {
    updateMetadata.renderStartedAt = nowIso();
  }

  if (next.status === "completed") {
    if (!outputMediaAssetId) {
      const asset = await createMockOutputMediaAsset(job);
      outputMediaAssetId = asset?.id ?? null;
    }

    updateMetadata.renderCompletedAt = nowIso();
    updateMetadata.outputContentType = "video/mp4";
    updateMetadata.outputFileName = `${job.id}.mp4`;
  }

  const updated = await updateVideoJobStatus(job.id, next.status, next.progress, {
    outputMediaAssetId,
    metadata: updateMetadata,
  });

  if (!updated) {
    return null;
  }

  if (next.status === "rendering" && job.status !== "rendering") {
    logRenderStarted(updated);
  }

  if (next.status === "completed") {
    logRenderCompleted(updated);
  }

  return updated;
}

export async function failVideoGenerationJob(
  jobId: string,
  errorMessage: string,
): Promise<VideoGenerationJob | null> {
  const profile = await getCurrentProfile();
  const userId = profile.user?.id ?? profile.profile?.user_id ?? DEFAULT_MOCK_USER_ID;
  const job = await getVideoGenerationJob(userId, jobId);

  if (!job) {
    return null;
  }

  const updated = await updateVideoJobStatus(job.id, "failed", job.progress, {
    errorMessage,
  });

  if (updated) {
    logRenderFailed(updated);
  }

  return updated;
}

export async function cancelVideoGenerationJob(jobId: string): Promise<VideoGenerationJob | null> {
  const profile = await getCurrentProfile();
  const userId = profile.user?.id ?? profile.profile?.user_id ?? DEFAULT_MOCK_USER_ID;
  const job = await getVideoGenerationJob(userId, jobId);

  if (!job) {
    return null;
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return job;
  }

  return updateVideoJobStatus(job.id, "cancelled", job.progress);
}
