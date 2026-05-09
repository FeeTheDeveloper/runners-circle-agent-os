import { NextResponse } from "next/server";
import { z } from "zod";
import { getBrandModeSettings, getBrandProfile, updateBrandProfile } from "@/lib/services/brand";
import { getCurrentProfile } from "@/lib/services/profiles";
import { brandModeStrictnessLevels, brandTones } from "@/lib/types/brand";
import { promotionChannels } from "@/lib/types/promotions";

export const runtime = "nodejs";

const requestSchema = z.object({
  profile: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      primaryColor: z.string().min(1).optional(),
      secondaryColor: z.string().min(1).optional(),
      accentColor: z.string().min(1).optional(),
      typographyStyle: z.string().min(1).optional(),
      visualStyle: z.string().min(1).optional(),
      motionStyle: z.string().min(1).optional(),
      tone: z.enum(brandTones).optional(),
      tagline: z.string().min(1).optional(),
      audience: z.string().min(1).optional(),
      keywords: z.array(z.string().min(1)).optional(),
      bannedWords: z.array(z.string().min(1)).optional(),
      preferredPlatforms: z.array(z.enum(promotionChannels)).optional(),
      logoUrl: z.string().min(1).optional(),
      brandVoiceNotes: z.string().min(1).optional(),
      callToActionStyle: z.string().min(1).optional(),
    })
    .default({}),
  modeSettings: z
    .object({
      enabled: z.boolean().optional(),
      strictness: z.enum(brandModeStrictnessLevels).optional(),
      injectPromptModifiers: z.boolean().optional(),
      enforceBrandVoice: z.boolean().optional(),
      enforceColorDirection: z.boolean().optional(),
      enforceMotionStyle: z.boolean().optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";

    return NextResponse.json({
      success: true,
      data: {
        brandProfile: getBrandProfile(userId),
        brandModeSettings: getBrandModeSettings(userId),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to load brand profile.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
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
            message: parsed.error.issues[0]?.message ?? "Invalid brand profile payload.",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 },
      );
    }

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const result = updateBrandProfile({
      userId,
      profile: parsed.data.profile,
      modeSettings: parsed.data.modeSettings,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Unable to update brand profile.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 },
    );
  }
}
