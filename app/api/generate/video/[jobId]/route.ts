import { NextResponse } from "next/server";
import { getVideoGenerationJob } from "@/lib/services/video-generation";
import { getCurrentProfile } from "@/lib/services/profiles";
import {
  type GenerationError,
  type VideoGenerationJobDetailResponse,
} from "@/lib/types/generation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
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
    const profile = await getCurrentProfile();
    const userId = profile.user?.id ?? profile.profile?.user_id ?? "mock-user";
    const job = await getVideoGenerationJob(userId, jobId);

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
        message: "Unexpected error while fetching video job.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
