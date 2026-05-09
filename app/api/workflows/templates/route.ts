import { NextResponse } from "next/server";
import { getWorkflowTemplates } from "@/lib/services/workflows";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        templates: getWorkflowTemplates(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load workflow templates.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
