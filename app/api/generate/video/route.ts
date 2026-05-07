import { NextResponse } from "next/server";
import { z } from "zod";
import { createVideoGenerationJob } from "@/lib/services/video-generation";
import { enqueueVideoJob } from "@/lib/services/render-queue";
import { getCurrentProfile } from "@/lib/services/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  videoFormats,
  type GenerationError,
  type VideoGenerationJobAcceptedResponse,
} from "@/lib/types/generation";

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

    if (isSupabaseConfigured()) {
      const profile = await getCurrentProfile();

      if (!profile.user) {
        const body: GenerationError = {
          success: false,
          error: {
            message: "Authentication required for video generation.",
            code: "INVALID_AGENT_TASK",
          },
        };

        return NextResponse.json(body, { status: 401 });
      }
    }

    const result = await createVideoGenerationJob(parsed.data);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    enqueueVideoJob(result.data.id);

    const body: VideoGenerationJobAcceptedResponse = {
      success: true,
      data: {
        job: {
          id: result.data.id,
          status: result.data.status,
          progress: result.data.progress,
        },
        nextStep: "Video job queued. Poll the job endpoint for updates.",
      },
    };

    return NextResponse.json(body, { status: 202 });
  } catch {
    const body: GenerationError = {
      success: false,
      error: {
        message: "Unexpected error while queueing video generation.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
