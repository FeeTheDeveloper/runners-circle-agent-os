import { NextResponse } from "next/server";
import { z } from "zod";
import {
  cancelDistributionJob,
  getDistributionActorContext,
  getDistributionJobById,
  retryDistributionJob,
} from "@/lib/services/distribution";
import type { DistributionError } from "@/lib/types/distribution";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["cancel", "retry"]),
});

interface DistributionJobRouteProps {
  params: Promise<{
    jobId: string;
  }>;
}

function buildError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    { status },
  );
}

export async function GET(_: Request, { params }: DistributionJobRouteProps) {
  const { jobId } = await params;
  const job = getDistributionJobById(jobId);

  if (!job) {
    return buildError("Distribution job not found.", 404);
  }

  const actorContext = await getDistributionActorContext(job.teamId);

  if (actorContext.currentProfile.mode === "supabase" && !actorContext.currentProfile.isAuthenticated) {
    return buildError("Authentication is required to view distribution jobs.", 401);
  }

  if (!actorContext.team || !actorContext.teamRole) {
    return buildError("Team membership is required to view distribution jobs.", 403);
  }

  return NextResponse.json({
    success: true,
    data: {
      distributionJob: job,
    },
  });
}

export async function PATCH(request: Request, { params }: DistributionJobRouteProps) {
  try {
    const { jobId } = await params;
    const job = getDistributionJobById(jobId);

    if (!job) {
      return buildError("Distribution job not found.", 404);
    }

    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return buildError(parsed.error.issues[0]?.message ?? "Invalid distribution job action.", 400);
    }

    const actorContext = await getDistributionActorContext(job.teamId);

    if (actorContext.currentProfile.mode === "supabase" && !actorContext.currentProfile.isAuthenticated) {
      return buildError("Authentication is required to update distribution jobs.", 401);
    }

    if (!actorContext.team || !actorContext.teamRole) {
      return buildError("Team membership is required to update distribution jobs.", 403);
    }

    if (!actorContext.canManage) {
      return buildError("Your role cannot update distribution jobs.", 403);
    }

    const result =
      parsed.data.action === "cancel" ? cancelDistributionJob(jobId) : retryDistributionJob(jobId);

    if (!result.success) {
      const status = result.error.code === "JOB_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json({
      success: true,
      data: {
        distributionJob: result.data.distributionJob,
      },
    });
  } catch {
    const body: DistributionError = {
      success: false,
      error: {
        message: "Unexpected error while updating the distribution job.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
