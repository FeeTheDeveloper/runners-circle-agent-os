import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/services/activity";
import {
  getFailureSnapshot,
  getNextRecommendedActions,
  getOperatorMetrics,
  getQueueSnapshot,
  getReviewQueue,
} from "@/lib/services/operator";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        metrics: getOperatorMetrics(),
        queues: getQueueSnapshot(),
        failures: getFailureSnapshot(),
        reviewQueue: getReviewQueue(),
        nextActions: getNextRecommendedActions(),
        recentActivity: getRecentActivity(8),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to create operator snapshot.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
