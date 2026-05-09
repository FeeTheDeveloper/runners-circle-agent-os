import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession } from "@/lib/services/stripe-checkout";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getTeamRoleForUser } from "@/lib/services/teams";
import { planTiers } from "@/lib/types/billing";
import { stripeBillingIntervals } from "@/lib/types/stripe";

export const runtime = "nodejs";

const requestSchema = z.object({
  planTier: z.enum(planTiers),
  interval: z.enum(stripeBillingIntervals),
  teamId: z.string().trim().min(1).nullable().optional(),
});

function getActorIdentity(profile: Awaited<ReturnType<typeof getCurrentProfile>>) {
  return {
    userId: profile.user?.id ?? profile.profile?.user_id ?? (profile.mode === "mock" ? "mock-user" : null),
    email: profile.user?.email ?? profile.profile?.email ?? null,
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
            message: parsed.error.issues[0]?.message ?? "Invalid checkout payload.",
            code: "INVALID_INPUT",
          },
        },
        { status: 400 },
      );
    }

    if (parsed.data.planTier === "free") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Free plan downgrades are not handled through Stripe Checkout.",
            code: "PLAN_NOT_ELIGIBLE",
          },
        },
        { status: 400 },
      );
    }

    const currentProfile = await getCurrentProfile();

    if (currentProfile.mode !== "mock" && !currentProfile.isAuthenticated) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Authentication is required to create a Stripe checkout session.",
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
            message: "No billing actor could be resolved for this checkout session.",
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
              message: "Only team owners and admins can start live billing checkout.",
              code: "INSUFFICIENT_ROLE",
            },
          },
          { status: 403 },
        );
      }
    }

    const checkout = await createCheckoutSession({
      userId: actor.userId,
      email: actor.email,
      planTier: parsed.data.planTier,
      interval: parsed.data.interval,
      teamId,
    });

    if (!checkout.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: checkout.message,
            code: "CHECKOUT_UNAVAILABLE",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        checkout,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to create the Stripe checkout session.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
