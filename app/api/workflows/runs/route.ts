import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser } from "@/lib/services/teams";
import { createWorkflowRun, getWorkflowProgress, getWorkflowRuns } from "@/lib/services/workflows";

export const runtime = "nodejs";

const createRunSchema = z.object({
  templateId: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET() {
  try {
    const workflowRuns = getWorkflowRuns();

    return NextResponse.json({
      success: true,
      data: {
        workflowRuns,
        progress: workflowRuns
          .map((run) => getWorkflowProgress(run.id))
          .filter((entry): entry is NonNullable<ReturnType<typeof getWorkflowProgress>> => entry !== null),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load workflow runs.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createRunSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid workflow run request.",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 },
      );
    }

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);
    const workflowRun = createWorkflowRun(parsed.data.templateId, {
      ...parsed.data.input,
      userId,
      teamId: team?.id ?? null,
    });

    if (!workflowRun) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Workflow template not found.",
            code: "NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          workflowRun,
          progress: getWorkflowProgress(workflowRun.id),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to create workflow run.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
