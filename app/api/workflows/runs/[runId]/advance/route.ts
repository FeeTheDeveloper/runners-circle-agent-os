import { NextResponse } from "next/server";
import { z } from "zod";
import {
  advanceWorkflowStep,
  failWorkflowStep,
  getWorkflowProgress,
  markWorkflowStepNeedsReview,
} from "@/lib/services/workflows";

export const runtime = "nodejs";

const advanceSchema = z.object({
  stepId: z.string().min(1),
  action: z.enum(["complete", "needs_review", "fail"]).optional().default("complete"),
  output: z.record(z.string(), z.unknown()).optional().default({}),
  error: z.string().optional(),
});

interface WorkflowAdvanceRouteProps {
  params: Promise<{
    runId: string;
  }>;
}

export async function POST(request: Request, { params }: WorkflowAdvanceRouteProps) {
  try {
    const { runId } = await params;
    const payload = await request.json();
    const parsed = advanceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid workflow step request.",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 },
      );
    }

    const { action, stepId, output } = parsed.data;
    const workflowRun =
      action === "needs_review"
        ? markWorkflowStepNeedsReview(runId, stepId)
        : action === "fail"
          ? failWorkflowStep(runId, stepId, parsed.data.error ?? "Workflow step failed from the workflow builder.")
          : advanceWorkflowStep(runId, stepId, output);

    if (!workflowRun) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Workflow run or step was not found.",
            code: "NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        workflowRun,
        progress: getWorkflowProgress(runId),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to advance workflow step.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
