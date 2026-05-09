import { NextResponse } from "next/server";
import { getBillingAccountAsync, getBillingReadiness, getCurrentPlanAsync } from "@/lib/services/billing";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser } from "@/lib/services/teams";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);
    const teamId = team?.id ?? null;

    return NextResponse.json({
      success: true,
      data: {
        billingAccount: await getBillingAccountAsync(userId, teamId),
        currentPlan: await getCurrentPlanAsync(userId, teamId),
        billingReadiness: getBillingReadiness(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load billing status.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
