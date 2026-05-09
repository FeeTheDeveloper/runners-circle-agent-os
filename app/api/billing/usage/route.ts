import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser, getTeamMembers } from "@/lib/services/teams";
import { getUsageSnapshotAsync } from "@/lib/services/usage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);
    const teamMembers = team ? await getTeamMembers(team.id) : [];
    const seatCount = team ? teamMembers.length : 1;

    return NextResponse.json({
      success: true,
      data: {
        usage: await getUsageSnapshotAsync(userId, team?.id ?? null, seatCount),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load billing usage.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
