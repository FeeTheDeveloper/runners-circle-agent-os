import { NextResponse } from "next/server";
import { z } from "zod";
import { addMediaToCampaign } from "@/lib/services/campaigns";
import type { CampaignError, CampaignResponse } from "@/lib/types/campaigns";

export const runtime = "nodejs";

const requestSchema = z.object({
  campaignId: z.string().min(1),
  mediaAssetId: z.string().min(1),
});

function getErrorStatus(code: CampaignError["error"]["code"]) {
  switch (code) {
    case "CAMPAIGN_NOT_FOUND":
    case "MEDIA_NOT_FOUND":
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
          message: parsed.error.issues[0]?.message ?? "Invalid campaign media payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const result = addMediaToCampaign(parsed.data.campaignId, parsed.data.mediaAssetId);

    if (!result.success) {
      return NextResponse.json(result, { status: getErrorStatus(result.error.code) });
    }

    const body: CampaignResponse<(typeof result.data)> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: CampaignError = {
      success: false,
      error: {
        message: "Unexpected error while linking media to campaign.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
