import { validateAgentTask } from "@/lib/services/agent-tasks";
import { aspectRatios, type GenerationResponse, type GenerationResult, type ImageGenerationInput } from "@/lib/types/generation";

function createImageId() {
  return `img_${crypto.randomUUID().slice(0, 8)}`;
}

function summarizePrompt(prompt: string) {
  return prompt.trim().split(/\s+/).slice(0, 5).join(" ");
}

function createMockThumbnail(title: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#171717" />
          <stop offset="100%" stop-color="#262626" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" rx="52" fill="url(#bg)" />
      <rect x="64" y="64" width="1072" height="772" rx="42" fill="none" stroke="#f97316" stroke-opacity="0.45" />
      <circle cx="940" cy="220" r="132" fill="#00d4ff" fill-opacity="0.12" />
      <circle cx="250" cy="700" r="210" fill="#f97316" fill-opacity="0.16" />
      <text x="86" y="170" fill="#f5f5f4" font-size="34" font-family="Arial, sans-serif" letter-spacing="8">RUNNERS CIRCLE</text>
      <text x="86" y="266" fill="#f5f5f4" font-size="78" font-weight="700" font-family="Arial, sans-serif">IMAGE MOCK</text>
      <text x="86" y="352" fill="#d6d3d1" font-size="28" font-family="Arial, sans-serif">${title}</text>
      <text x="86" y="790" fill="#fdba74" font-size="24" font-family="Arial, sans-serif">Studio contract preview only</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createImageGeneration(input: ImageGenerationInput): GenerationResponse<GenerationResult> {
  if (!input.prompt.trim() || !input.style.trim() || !input.agentId.trim()) {
    return {
      success: false,
      error: {
        message: "Prompt, style, and agent are required for image generation.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  if (!aspectRatios.includes(input.aspectRatio)) {
    return {
      success: false,
      error: {
        message: "Invalid image aspect ratio.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  const validation = validateAgentTask(input.agentId, "generate_image_prompt");

  if (!validation.valid) {
    return {
      success: false,
      error: {
        message: validation.message,
        code: validation.code,
      },
    };
  }

  const id = createImageId();
  const title = `Image concept · ${summarizePrompt(input.prompt)}`;
  const createdAt = new Date().toISOString();
  const result: GenerationResult = {
    id,
    type: "image",
    title,
    prompt: input.prompt.trim(),
    status: "completed",
    thumbnailUrl: createMockThumbnail(title),
    mediaUrl: `mock://studio/images/${id}.png`,
    createdAt,
    assignedAgentId: input.agentId,
  };

  // TODO: Replace the mock result with real OpenAI image generation once the provider layer is wired.
  // TODO: Persist generated media metadata to Supabase when storage and database layers are introduced.

  return {
    success: true,
    data: result,
  };
}
