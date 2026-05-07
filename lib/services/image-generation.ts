import "server-only";
import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  getOpenAIClient,
  isOpenAIConfigured,
  mapAspectRatioToImageSize,
} from "@/lib/openai/client";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import {
  buildStoragePath,
  finalizeUploadedMediaAsset,
  generateMediaAssetUuid,
  uploadMediaBytes,
} from "@/lib/services/media-storage";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getSupabasePublicEnv, isServiceRoleConfigured } from "@/lib/supabase/env";
import {
  aspectRatios,
  type GenerationResponse,
  type GenerationResult,
  type ImageGenerationInput,
  type ImageGenerationProvider,
} from "@/lib/types/generation";

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

function buildPrompt(input: ImageGenerationInput) {
  const segments = [input.prompt.trim()];

  if (input.style.trim()) {
    segments.push(`Style direction: ${input.style.trim()}.`);
  }

  if (input.brandMode) {
    segments.push(
      "Brand: Runners Circle premium athletic-tech aesthetic — charcoal foundation, orange accents, electric edge lighting, cinematic editorial confidence.",
    );
  }

  return segments.join("\n\n");
}

function buildMockResult(input: ImageGenerationInput): GenerationResult {
  const id = createImageId();
  const title = `Image concept · ${summarizePrompt(input.prompt)}`;
  const createdAt = new Date().toISOString();

  return {
    id,
    type: "image",
    title,
    prompt: input.prompt.trim(),
    status: "completed",
    thumbnailUrl: createMockThumbnail(title),
    mediaUrl: `mock://studio/images/${id}.png`,
    createdAt,
    assignedAgentId: input.agentId,
    pendingUpload: true,
    storageBucket: null,
    storagePath: null,
    finalizeRequired: true,
    provider: "mock",
    storageReady: false,
    persisted: false,
    assetId: null,
    revisedPrompt: null,
  };
}

function validateImageInput(input: ImageGenerationInput) {
  if (!input.prompt.trim() || !input.style.trim() || !input.agentId.trim()) {
    return {
      success: false as const,
      error: {
        message: "Prompt, style, and agent are required for image generation.",
        code: "VALIDATION_ERROR" as const,
      },
    };
  }

  if (!aspectRatios.includes(input.aspectRatio)) {
    return {
      success: false as const,
      error: {
        message: "Invalid image aspect ratio.",
        code: "VALIDATION_ERROR" as const,
      },
    };
  }

  const validation = validateAgentTask(input.agentId, "generate_image_prompt");

  if (!validation.valid) {
    return {
      success: false as const,
      error: {
        message: validation.message,
        code: validation.code,
      },
    };
  }

  return { success: true as const };
}

export function isOpenAIImageProviderReady(): boolean {
  return isOpenAIConfigured();
}

export function getImageProvider(): ImageGenerationProvider {
  return isOpenAIConfigured() ? "openai" : "mock";
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch generated image (${response.status}).`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function callOpenAIImage(input: ImageGenerationInput): Promise<{
  bytes: Uint8Array;
  revisedPrompt: string | null;
}> {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OpenAI client is not configured.");
  }

  const size = mapAspectRatioToImageSize(input.aspectRatio);
  const prompt = buildPrompt(input);

  const response = await client.images.generate({
    model: DEFAULT_OPENAI_IMAGE_MODEL,
    prompt,
    size,
    n: 1,
  });

  const first = response.data?.[0];

  if (!first) {
    throw new Error("OpenAI did not return an image.");
  }

  const revisedPrompt = first.revised_prompt ?? null;

  if (first.b64_json) {
    return {
      bytes: decodeBase64ToBytes(first.b64_json),
      revisedPrompt,
    };
  }

  if (first.url) {
    return {
      bytes: await fetchImageBytes(first.url),
      revisedPrompt,
    };
  }

  throw new Error("OpenAI image response did not include image data.");
}

async function persistOpenAIImage(input: ImageGenerationInput): Promise<GenerationResult> {
  const profile = await getCurrentProfile();
  const userId = profile.user?.id ?? profile.profile?.user_id ?? "mock-user";
  const env = getSupabasePublicEnv();
  const assetId = generateMediaAssetUuid();
  const storage = buildStoragePath({
    kind: "media",
    userId,
    assetId,
    mediaType: "image",
  });
  const thumbnailPath = `${userId}/${assetId}.png`;
  const fileName = storage.fileName.endsWith(".png")
    ? storage.fileName
    : `${storage.fileName}.png`;

  const { bytes, revisedPrompt } = await callOpenAIImage(input);

  await uploadMediaBytes({
    bucket: storage.bucket,
    path: storage.path,
    bytes,
    contentType: "image/png",
    upsert: false,
  });

  let thumbnailBucket: string | null = null;
  let thumbnailWritten = false;

  if (env.mediaThumbnailsBucket) {
    try {
      await uploadMediaBytes({
        bucket: env.mediaThumbnailsBucket,
        path: thumbnailPath,
        bytes,
        contentType: "image/png",
        upsert: false,
      });
      thumbnailBucket = env.mediaThumbnailsBucket;
      thumbnailWritten = true;
    } catch {
      thumbnailBucket = null;
      thumbnailWritten = false;
    }
  }

  const title = `Image · ${summarizePrompt(input.prompt)}`;
  const persistedAsset = await finalizeUploadedMediaAsset({
    assetId,
    assetType: "image",
    title,
    prompt: input.prompt.trim(),
    storageBucket: storage.bucket,
    storagePath: storage.path,
    thumbnailBucket: thumbnailWritten ? thumbnailBucket : null,
    thumbnailPath: thumbnailWritten ? thumbnailPath : null,
    contentType: "image/png",
    fileName,
    assignedAgentId: input.agentId,
    status: "ready",
    metadata: {
      provider: "openai",
      model: DEFAULT_OPENAI_IMAGE_MODEL,
      aspectRatio: input.aspectRatio,
      style: input.style,
      brandMode: input.brandMode,
      revisedPrompt,
      contentType: "image/png",
      fileName,
    },
  });

  const createdAt = persistedAsset.createdAt;

  return {
    id: persistedAsset.id,
    type: "image",
    title: persistedAsset.title,
    prompt: persistedAsset.prompt,
    status: "completed",
    thumbnailUrl: persistedAsset.thumbnailUrl,
    mediaUrl: persistedAsset.mediaUrl,
    createdAt,
    assignedAgentId: persistedAsset.assignedAgentId,
    pendingUpload: false,
    storageBucket: persistedAsset.storageBucket,
    storagePath: persistedAsset.storagePath,
    finalizeRequired: false,
    provider: "openai",
    storageReady: true,
    persisted: persistedAsset.source === "supabase",
    assetId: persistedAsset.id,
    revisedPrompt,
  };
}

export async function createImageGeneration(
  input: ImageGenerationInput,
): Promise<GenerationResponse<GenerationResult>> {
  const validation = validateImageInput(input);

  if (!validation.success) {
    return validation;
  }

  if (!isOpenAIConfigured() || !isServiceRoleConfigured()) {
    return {
      success: true,
      data: buildMockResult(input),
    };
  }

  try {
    const result = await persistOpenAIImage(input);
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate image with OpenAI.";

    return {
      success: false,
      error: {
        message,
        code: "INTERNAL_ERROR",
      },
    };
  }
}
