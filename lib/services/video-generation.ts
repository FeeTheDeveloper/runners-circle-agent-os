import { validateAgentTask } from "@/lib/services/agent-tasks";
import { applyBrandModeToPrompt, getBrandModeSettings, getBrandProfile, validateBrandOutput } from "@/lib/services/brand";
import { checkUsageLimit, consumeUsageCredit, recordUsageEvent } from "@/lib/services/usage";
import {
  videoDurations,
  videoFormats,
  type GenerationResponse,
  type GenerationResult,
  type VideoGenerationInput,
} from "@/lib/types/generation";

function createVideoId() {
  return `vid_${crypto.randomUUID().slice(0, 8)}`;
}

function summarizePrompt(prompt: string) {
  return prompt.trim().split(/\s+/).slice(0, 5).join(" ");
}

function createMockThumbnail(title: string, colors?: { primary: string; accent: string }) {
  const primary = colors?.primary ?? "#f97316";
  const accent = colors?.accent ?? "#00d4ff";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="52" fill="url(#bg)" />
      <rect x="64" y="64" width="1072" height="772" rx="42" fill="none" stroke="${accent}" stroke-opacity="0.42" />
      <circle cx="920" cy="230" r="150" fill="${accent}" fill-opacity="0.14" />
      <circle cx="280" cy="710" r="230" fill="${primary}" fill-opacity="0.14" />
      <polygon points="526,346 526,554 714,450" fill="#f5f5f4" fill-opacity="0.92" />
      <text x="86" y="170" fill="#f5f5f4" font-size="34" font-family="Arial, sans-serif" letter-spacing="8">RUNNERS CIRCLE</text>
      <text x="86" y="266" fill="#f5f5f4" font-size="78" font-weight="700" font-family="Arial, sans-serif">VIDEO JOB</text>
      <text x="86" y="352" fill="#d1fae5" font-size="28" font-family="Arial, sans-serif">${title}</text>
      <text x="86" y="790" fill="${accent}" font-size="24" font-family="Arial, sans-serif">Queued render contract preview only</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createVideoGeneration(input: VideoGenerationInput): GenerationResponse<GenerationResult> {
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

  const brandProfile = getBrandProfile(input.userId);
  const brandModeSettings = getBrandModeSettings(input.userId);
  const promptModifier = applyBrandModeToPrompt({
    basePrompt: input.prompt.trim(),
    userId: input.userId,
    kind: "video",
    brandProfile,
    brandModeSettings: {
      ...brandModeSettings,
      enabled: input.brandMode && brandModeSettings.enabled,
    },
  });
  const brandValidation = validateBrandOutput({
    content: promptModifier.enhancedPrompt,
    brandProfile,
  });
  const usageSummary = checkUsageLimit({
    userId: input.userId ?? "mock-user",
    teamId: input.teamId ?? null,
    type: "video_generation",
  });
  const id = createVideoId();
  const title = `Video job · ${summarizePrompt(promptModifier.originalPrompt)}`;
  const createdAt = new Date().toISOString();
  const result: GenerationResult = {
    id,
    type: "video",
    title,
    prompt: promptModifier.enhancedPrompt,
    originalPrompt: promptModifier.originalPrompt,
    enhancedPrompt: promptModifier.enhancedPrompt,
    status: "queued",
    thumbnailUrl: createMockThumbnail(title, {
      primary: brandProfile.primaryColor,
      accent: brandProfile.accentColor,
    }),
    mediaUrl: `mock://studio/video-jobs/${id}`,
    createdAt,
    assignedAgentId: input.agentId,
    brandProfileId: promptModifier.brandProfileId,
    appliedBrandProfile: brandProfile.name,
    brandTone: brandProfile.tone,
    brandModeApplied: promptModifier.brandModeApplied,
    brandWarnings: brandValidation.warnings,
    pendingUpload: true,
    storageBucket: null,
    storagePath: null,
    finalizeRequired: true,
    usageSummary,
  };

  consumeUsageCredit({
    userId: input.userId ?? "mock-user",
    teamId: input.teamId ?? null,
    type: "video_generation",
  });
  recordUsageEvent({
    userId: input.userId ?? "mock-user",
    teamId: input.teamId ?? null,
    type: "video_generation",
    relatedEntityType: "generation_job",
    relatedEntityId: result.id,
    metadata: {
      agentId: input.agentId,
      duration: input.duration,
      format: input.format,
      warning: usageSummary.warning,
    },
  });

  // TODO: Replace the mock queued result with a real OpenAI or render-provider submission flow.
  // TODO: Hand off queued video jobs to a worker or durable queue once background execution is introduced.

  return {
    success: true,
    data: result,
  };
}
