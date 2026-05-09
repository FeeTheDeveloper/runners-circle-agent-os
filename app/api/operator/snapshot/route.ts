import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/services/activity";
import { getDistributionJobs, getDistributionOperationalSummary, getDistributionReadinessSummary } from "@/lib/services/distribution";
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
        distribution: {
          jobs: getDistributionJobs(),
          summary: getDistributionOperationalSummary(),
          readiness: getDistributionReadinessSummary(),
        },
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
