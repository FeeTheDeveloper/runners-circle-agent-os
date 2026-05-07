import { NextResponse } from "next/server";
import { z } from "zod";
import { preparePromotionPackage } from "@/lib/services/promotions";
import { promotionChannels, type PromotionError, type PromotionResponse } from "@/lib/types/promotions";

export const runtime = "nodejs";

const requestSchema = z.object({
  campaignId: z.string().min(1),
  mediaAssetIds: z.array(z.string().min(1)).min(1),
  channels: z.array(z.enum(promotionChannels)).min(1),
  tone: z.string().min(1),
  callToAction: z.string().min(1),
  assignedAgentId: z.string().min(1),
});

function getErrorStatus(code: PromotionError["error"]["code"]) {
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
      const body: PromotionError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid promotion package payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const result = preparePromotionPackage(parsed.data);

    if (!result.success) {
      return NextResponse.json(result, { status: getErrorStatus(result.error.code) });
    }

    const body: PromotionResponse<(typeof result.data)> = {
      success: true,
      data: result.data,
    };

    return NextResponse.json(body, { status: 201 });
  } catch {
    const body: PromotionError = {
      success: false,
      error: {
        message: "Unexpected error while preparing promotion package.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
