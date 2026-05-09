import { NextResponse } from "next/server";
import { z } from "zod";
import { createCampaign } from "@/lib/services/campaigns";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getPrimaryTeamForUser } from "@/lib/services/teams";
import { campaignChannels, campaignObjectives, type CampaignError, type CampaignResponse } from "@/lib/types/campaigns";

export const runtime = "nodejs";

const requestSchema = z.object({
  name: z.string().min(1),
  objective: z.enum(campaignObjectives),
  channels: z.array(z.enum(campaignChannels)).min(1),
  mediaAssetIds: z.array(z.string().min(1)).min(1),
  targetAudience: z.string().min(1),
  coreMessage: z.string().min(1),
  assignedAgentId: z.string().min(1),
});

function getErrorStatus(code: CampaignError["error"]["code"]) {
  switch (code) {
    case "MEDIA_NOT_FOUND":
      return 404;
    case "CAMPAIGN_NOT_FOUND":
      return 404;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      const body: CampaignError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid campaign payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const team = await getPrimaryTeamForUser(userId);
    const result = createCampaign({
      ...parsed.data,
      userId,
      teamId: team?.id ?? null,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: getErrorStatus(result.error.code) });
    }

    const body: CampaignResponse<(typeof result.data)> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(body, { status: 201 });
  } catch {
    const body: CampaignError = {
      success: false,
      error: {
        message: "Unexpected error while creating campaign.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
