import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/services/profiles";
import { createApprovalRequest, getApprovalRequestSummaries } from "@/lib/services/reviews";
import { getPrimaryTeamForUser } from "@/lib/services/teams";
import { approvalEntityTypes } from "@/lib/types/team";

export const runtime = "nodejs";

const requestSchema = z.object({
  entityType: z.enum(approvalEntityTypes),
  entityId: z.string().min(1),
  assignedReviewerId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

function getCurrentUserId(profile: Awaited<ReturnType<typeof getCurrentProfile>>) {
  return profile.user?.id ?? profile.profile?.user_id ?? "mock-user";
}

export async function GET() {
  const reviews = getApprovalRequestSummaries();

  return NextResponse.json({
    success: true,
    data: {
      reviews,
    },
  });
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
            message: parsed.error.issues[0]?.message ?? "Invalid review request payload.",
          },
        },
        { status: 400 },
      );
    }

    const profile = await getCurrentProfile();
    const userId = getCurrentUserId(profile);
    const team = await getPrimaryTeamForUser(userId);
    const reviewRequest = createApprovalRequest({
      ...parsed.data,
      requestedBy: userId,
      teamId: team?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      data: {
        reviewRequest,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unable to create review request.",
        },
      },
      { status: 400 },
    );
  }
}
