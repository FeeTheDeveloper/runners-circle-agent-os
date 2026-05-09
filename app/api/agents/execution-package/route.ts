import { NextResponse } from "next/server";
import { z } from "zod";
import { createExecutionPackage } from "@/lib/services/agent-execution";

export const runtime = "nodejs";

const requestSchema = z.object({
  taskId: z.string().min(1),
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
            message: parsed.error.issues[0]?.message ?? "Invalid execution package request.",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 },
      );
    }

    const executionPackage = createExecutionPackage(parsed.data.taskId);

    if (!executionPackage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Task not found for execution packaging.",
            code: "TASK_NOT_FOUND",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          executionPackage,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unexpected error while creating execution package.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
