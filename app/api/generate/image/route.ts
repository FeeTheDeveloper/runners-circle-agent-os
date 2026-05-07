import { NextResponse } from "next/server";
import { z } from "zod";
import { createImageGeneration } from "@/lib/services/image-generation";
import { getCurrentProfile } from "@/lib/services/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  aspectRatios,
  type GenerationError,
  type GenerationResponse,
  type GenerationResult,
} from "@/lib/types/generation";

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

    if (isSupabaseConfigured()) {
      const profile = await getCurrentProfile();

      if (!profile.user) {
        const body: GenerationError = {
          success: false,
          error: {
            message: "Authentication required for image generation.",
            code: "INVALID_AGENT_TASK",
          },
        };

        return NextResponse.json(body, { status: 401 });
      }
    }

    const result = await createImageGeneration(parsed.data);

    if (!result.success) {
      const status = result.error.code === "VALIDATION_ERROR" ? 400 : 500;
      return NextResponse.json(result, { status });
    }

    const body: GenerationResponse<{ generationResult: GenerationResult }> = {
      success: true,
      data: { generationResult: result.data },
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
