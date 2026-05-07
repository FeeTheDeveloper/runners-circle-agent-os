import { validateAgentTask } from "@/lib/services/agent-tasks";
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

  const id = createVideoId();
  const title = `Video job · ${summarizePrompt(input.prompt)}`;
  const createdAt = new Date().toISOString();
  const result: GenerationResult = {
    id,
    type: "video",
    title,
    prompt: input.prompt.trim(),
    status: "queued",
    thumbnailUrl: createMockThumbnail(title),
    mediaUrl: `mock://studio/video-jobs/${id}`,
    createdAt,
    assignedAgentId: input.agentId,
  };

  // TODO: Replace the mock queued result with a real OpenAI or render-provider submission flow.
  // TODO: Hand off queued video jobs to a worker or durable queue once background execution is introduced.

  return {
    success: true,
    data: result,
  };
}
