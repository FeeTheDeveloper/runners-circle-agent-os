import { NextResponse } from "next/server";
import { z } from "zod";
import { recordExecutionResult } from "@/lib/services/agent-execution";
import { agentExecutionStatuses } from "@/lib/types/agent-execution";

export const runtime = "nodejs";

const requestSchema = z.object({
  packageId: z.string().min(1),
  status: z.enum(agentExecutionStatuses),
  output: z.record(z.string(), z.unknown()).nullable(),
  reviewNotes: z.string(),
  nextRecommendedAgentId: z.string().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid execution result request.",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 },
      );
    }

    const executionResult = recordExecutionResult(parsed.data);

    if (!executionResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Execution package not found.",
            code: "PACKAGE_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          executionResult,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unexpected error while recording execution result.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
