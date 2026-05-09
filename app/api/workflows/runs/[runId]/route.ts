import { NextResponse } from "next/server";
import { getWorkflowProgress, getWorkflowRunById } from "@/lib/services/workflows";

export const runtime = "nodejs";

interface WorkflowRunRouteProps {
  params: Promise<{
    runId: string;
  }>;
}

export async function GET(_: Request, { params }: WorkflowRunRouteProps) {
  try {
    const { runId } = await params;
    const workflowRun = getWorkflowRunById(runId);

    if (!workflowRun) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Workflow run not found.",
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
          message: "Unable to load workflow run.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
