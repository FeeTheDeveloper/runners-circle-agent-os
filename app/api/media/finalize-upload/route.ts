import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeUploadedMediaAsset } from "@/lib/services/media-storage";
import {
  mediaTypes,
  type MediaDownloadError,
  type MediaFinalizeUploadSuccess,
} from "@/lib/types/media";

export const runtime = "nodejs";

const requestSchema = z.object({
  assetId: z.string().uuid().optional(),
  assetType: z.enum(mediaTypes),
  title: z.string().min(1),
  prompt: z.string().min(1),
  storageBucket: z.string().min(1),
  storagePath: z.string().min(1),
  thumbnailBucket: z.string().min(1).optional().nullable(),
  thumbnailPath: z.string().min(1).optional().nullable(),
  contentType: z.string().min(1),
  fileName: z.string().min(1),
  assignedAgentId: z.string().min(1).optional().nullable(),
  generationJobId: z.string().min(1).optional().nullable(),
  externalId: z.string().min(1).optional().nullable(),
  campaignId: z.string().min(1).optional().nullable(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const body: MediaDownloadError = {
      success: false,
      error: {
        message: "Invalid JSON payload.",
        code: "VALIDATION_ERROR",
      },
    };

    return NextResponse.json(body, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    const body: MediaDownloadError = {
      success: false,
      error: {
        message: parsed.error.issues[0]?.message ?? "Invalid finalize upload payload.",
        code: "VALIDATION_ERROR",
      },
    };

    return NextResponse.json(body, { status: 400 });
  }

  if (parsed.data.storagePath.startsWith(`${parsed.data.storageBucket}/`)) {
    const body: MediaDownloadError = {
      success: false,
      error: {
        message: "Storage path must not include the bucket prefix.",
        code: "VALIDATION_ERROR",
      },
    };

    return NextResponse.json(body, { status: 400 });
  }

  try {
    const mediaAsset = await finalizeUploadedMediaAsset({
      assetId: parsed.data.assetId,
      assetType: parsed.data.assetType,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      storageBucket: parsed.data.storageBucket,
      storagePath: parsed.data.storagePath,
      thumbnailBucket: parsed.data.thumbnailBucket ?? null,
      thumbnailPath: parsed.data.thumbnailPath ?? null,
      contentType: parsed.data.contentType,
      fileName: parsed.data.fileName,
      assignedAgentId: parsed.data.assignedAgentId ?? null,
      generationJobId: parsed.data.generationJobId ?? null,
      externalId: parsed.data.externalId ?? null,
      campaignId: parsed.data.campaignId ?? null,
    });

    const body: MediaFinalizeUploadSuccess = {
      success: true,
      data: { mediaAsset },
    };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finalize media asset.";
    const body: MediaDownloadError = {
      success: false,
      error: {
        message,
        code: "STORAGE_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
