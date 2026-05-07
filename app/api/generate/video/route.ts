import { NextResponse } from "next/server";
import { z } from "zod";
import { createVideoGeneration } from "@/lib/services/video-generation";
import { videoFormats, type GenerationError, type GenerationResponse, type GenerationResult } from "@/lib/types/generation";

export const runtime = "nodejs";

const requestSchema = z.object({
  prompt: z.string().min(1),
  motionStyle: z.string().min(1),
  duration: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
  format: z.enum(videoFormats),
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
          message: parsed.error.issues[0]?.message ?? "Invalid video generation payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const result = createVideoGeneration(parsed.data);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const body: GenerationResponse<GenerationResult> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(body, { status: 202 });
  } catch {
    const body: GenerationError = {
      success: false,
      error: {
        message: "Unexpected error while generating video contract.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
