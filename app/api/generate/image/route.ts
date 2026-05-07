import { NextResponse } from "next/server";
import { z } from "zod";
import { createImageGeneration } from "@/lib/services/image-generation";
import { aspectRatios, type GenerationError, type GenerationResponse, type GenerationResult } from "@/lib/types/generation";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().min(1),
  aspectRatio: z.enum(aspectRatios),
  brandMode: z.boolean(),
  agentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      const body: GenerationError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid image generation payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const result = createImageGeneration(parsed.data);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const body: GenerationResponse<GenerationResult> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(body, { status: 201 });
  } catch {
    const body: GenerationError = {
      success: false,
      error: {
        message: "Unexpected error while generating image contract.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
