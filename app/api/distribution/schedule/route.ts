import { NextResponse } from "next/server";
import { z } from "zod";
import { getDistributionActorContext, getDistributionJobById, scheduleDistributionJob } from "@/lib/services/distribution";
import type { DistributionError } from "@/lib/types/distribution";

export const runtime = "nodejs";

const requestSchema = z.object({
  jobId: z.string().min(1),
  scheduledFor: z.string().datetime(),
});

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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return buildError(parsed.error.issues[0]?.message ?? "Invalid schedule payload.", 400);
    }

    const job = getDistributionJobById(parsed.data.jobId);

    if (!job) {
      return buildError("Distribution job not found.", 404);
    }

    const actorContext = await getDistributionActorContext(job.teamId);

    if (actorContext.currentProfile.mode !== "mock" && !actorContext.currentProfile.isAuthenticated) {
      return buildError("Authentication is required to schedule distribution jobs.", 401);
    }

    if (!actorContext.team || !actorContext.teamRole) {
      return buildError("Team membership is required to schedule distribution jobs.", 403);
    }

    if (!actorContext.canManage) {
      return buildError("Your role cannot schedule distribution jobs.", 403);
    }

    const result = scheduleDistributionJob(parsed.data.jobId, parsed.data.scheduledFor);

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
        message: "Unexpected error while scheduling the distribution job.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
