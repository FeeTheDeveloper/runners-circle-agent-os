import "server-only";
import OpenAI from "openai";
import type { AspectRatio } from "@/lib/types/generation";

export type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "auto";

let cachedClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key);
}

export function getOpenAIClient(): OpenAI | null {
  if (!isOpenAIConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
    });
  }

  return cachedClient;
}

export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";

export function mapAspectRatioToImageSize(aspectRatio: AspectRatio): OpenAIImageSize {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "16:9":
      return "1536x1024";
    case "4:5":
    case "9:16":
      return "1024x1536";
    default:
      return "1024x1024";
  }
}
