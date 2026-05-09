import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerPortalSession } from "@/lib/services/stripe-checkout";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getTeamRoleForUser } from "@/lib/services/teams";

export const runtime = "nodejs";

const requestSchema = z.object({
  teamId: z.string().trim().min(1).nullable().optional(),
});

function getActorIdentity(profile: Awaited<ReturnType<typeof getCurrentProfile>>) {
  return {
    userId: profile.user?.id ?? profile.profile?.user_id ?? (profile.mode === "mock" ? "mock-user" : null),
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid portal payload.",
            code: "INVALID_INPUT",
          },
        },
        { status: 400 },
      );
    }

    const currentProfile = await getCurrentProfile();

    if (currentProfile.mode === "supabase" && !currentProfile.isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Authentication is required to open the Stripe customer portal.",
            code: "AUTH_REQUIRED",
          },
        },
        { status: 401 },
      );
    }

    const actor = getActorIdentity(currentProfile);

    if (!actor.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "No billing actor could be resolved for this portal session.",
            code: "MISSING_ACTOR",
          },
        },
        { status: 400 },
      );
    }

    const teamId = parsed.data.teamId?.trim() || null;

    if (teamId) {
      const teamRole = await getTeamRoleForUser(teamId, actor.userId);

      if (!teamRole) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Team membership is required to manage this billing scope.",
              code: "TEAM_MEMBERSHIP_REQUIRED",
            },
          },
          { status: 403 },
        );
      }

      if (!["owner", "admin"].includes(teamRole)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Only team owners and admins can open the billing portal for a team plan.",
              code: "INSUFFICIENT_ROLE",
            },
          },
          { status: 403 },
        );
      }
    }

    const portal = await createCustomerPortalSession({
      userId: actor.userId,
      teamId,
    });

    if (!portal.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: portal.message,
            code: "PORTAL_UNAVAILABLE",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        portal,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to create the Stripe customer portal session.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
