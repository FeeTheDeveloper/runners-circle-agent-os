import { NextResponse } from "next/server";
import { z } from "zod";
import { getMediaAssetDownload } from "@/lib/services/media-storage";
import type { MediaDownloadError, MediaDownloadSuccess } from "@/lib/types/media";

export const runtime = "nodejs";

const requestSchema = z.object({
  mediaAssetId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = requestSchema.safeParse(payload);

    if (!parsed.success) {
      const body: MediaDownloadError = {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid media download payload.",
          code: "VALIDATION_ERROR",
        },
      };

      return NextResponse.json(body, { status: 400 });
    }

    const download = await getMediaAssetDownload(parsed.data.mediaAssetId);

    if (!download) {
      const body: MediaDownloadError = {
        success: false,
        error: {
          message: "Media asset not found.",
          code: "MEDIA_NOT_FOUND",
        },
      };

      return NextResponse.json(body, { status: 404 });
    }

    const body: MediaDownloadSuccess = {
      success: true,
      data: download,
    };

    return NextResponse.json(body, { status: 200 });
  } catch {
    const body: MediaDownloadError = {
      success: false,
      error: {
        message: "Unexpected error while preparing media download.",
        code: "INTERNAL_ERROR",
      },
    };

    return NextResponse.json(body, { status: 500 });
  }
}
