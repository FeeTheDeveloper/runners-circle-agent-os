import { NextResponse } from "next/server";
import { processVideoGenerationJob } from "@/lib/services/video-generation";
import { getCurrentProfile } from "@/lib/services/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  type GenerationError,
  type VideoGenerationJobDetailResponse,
} from "@/lib/types/generation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  if (!jobId) {
    const body: GenerationError = {
      success: false,
      error: {
        message: "Missing job id.",
        code: "VALIDATION_ERROR",
      },
    };

    return NextResponse.json(body, { status: 400 });
  }

  try {
    if (isSupabaseConfigured()) {
      const profile = await getCurrentProfile();

      if (!profile.user) {
        const body: GenerationError = {
          success: false,
          error: {
            message: "Authentication required to process video jobs.",
            code: "INVALID_AGENT_TASK",
          },
        };

        return NextResponse.json(body, { status: 401 });
      }
    }

    const job = await processVideoGenerationJob(jobId);

    if (!job) {
      const body: GenerationError = {
        success: false,
        error: {
          message: "Video job not found.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 404 });
    }

    const body: VideoGenerationJobDetailResponse = {
      success: true,
      data: { job },
    };

    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: GenerationError = {
      success: false,
      error: {
        message: "Unexpected error while processing video job.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
