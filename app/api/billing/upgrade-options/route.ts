import { NextResponse } from "next/server";
import { getBillingReadiness, getCurrentPlanAsync, getUpgradeOptionsAsync } from "@/lib/services/billing";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser } from "@/lib/services/teams";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);

    return NextResponse.json({
      success: true,
      data: {
        currentPlan: await getCurrentPlanAsync(userId, team?.id ?? null),
        upgradeOptions: await getUpgradeOptionsAsync(userId, team?.id ?? null),
        billingReadiness: getBillingReadiness(),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load upgrade options.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
