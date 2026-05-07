import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/services/profiles";
import { createSignedUploadUrl, deleteStoredMediaAsset, registerStoredMediaAsset } from "@/lib/services/media-storage";
import { mediaTypes, type MediaDownloadError, type MediaUploadUrlSuccess } from "@/lib/types/media";

export const runtime = "nodejs";

const requestSchema = z.object({
  type: z.enum(mediaTypes),
  title: z.string().min(1),
  prompt: z.string().min(1),
  assignedAgentId: z.string().min(1),
  generationJobId: z.string().min(1).optional().nullable(),
  campaignId: z.string().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  let assetId: string | null = null;

  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      const body: MediaDownloadError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid media upload payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const asset = registerStoredMediaAsset({
      userId,
      type: parsed.data.type,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      assignedAgentId: parsed.data.assignedAgentId,
      generationJobId: parsed.data.generationJobId ?? null,
      campaignId: parsed.data.campaignId ?? null,
      status: "processing",
    });

    assetId = asset.id;

    const upload = await createSignedUploadUrl({
      userId,
      assetId: asset.id,
      mediaType: asset.type,
    });

    const body: MediaUploadUrlSuccess = {
      success: true,
      data: {
        asset,
        upload,
      },
    };

    return NextResponse.json(body, { status: 201 });
  } catch {
    if (assetId) {
      await deleteStoredMediaAsset(assetId);
    }

    const body: MediaDownloadError = {
      success: false,
      error: {
        message: "Unable to prepare a media upload URL.",
        code: "STORAGE_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
