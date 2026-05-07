import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/services/profiles";
import {
  createSignedDownloadUrl,
  getMediaAssetDownload,
  getUserMediaAssetById,
  recordDbDownloadEvent,
} from "@/lib/services/media-storage";
import type { MediaDownloadError, MediaDownloadSuccess } from "@/lib/types/media";

export const runtime = "nodejs";

const requestSchema = z.object({
  mediaAssetId: z.string().min(1),
});

function getFileNameFromPath(path: string) {
  const lastSegment = path.split("/").pop() ?? "generated-asset.bin";
  return lastSegment.startsWith("runners-circle-") ? lastSegment : `runners-circle-${lastSegment}`;
}

function getFileTypeFromName(name: string, fallback: string | null) {
  if (fallback) {
    return fallback;
  }

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".svg")) return "image/svg+xml";
  if (name.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

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

    const currentProfile = await getCurrentProfile();
    const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
    const dbAsset =
      currentProfile.mode === "supabase" && currentProfile.user
        ? await getUserMediaAssetById(userId, parsed.data.mediaAssetId)
        : null;

    if (dbAsset) {
      if (!dbAsset.storageBucket || !dbAsset.storagePath) {
        const body: MediaDownloadError = {
          success: false,
          error: {
            message: "Media asset is missing storage location.",
            code: "STORAGE_ERROR",
          },
        };

        return NextResponse.json(body, { status: 409 });
      }

      const fileName = dbAsset.metadata.fileName ?? getFileNameFromPath(dbAsset.storagePath);
      const download = await createSignedDownloadUrl({
        bucket: dbAsset.storageBucket,
        path: dbAsset.storagePath,
        fileName: typeof fileName === "string" ? fileName : undefined,
      });

      await recordDbDownloadEvent({
        mediaAssetId: dbAsset.id,
        fileName: download.fileName,
        fileType: getFileTypeFromName(
          download.fileName,
          typeof dbAsset.metadata.contentType === "string" ? dbAsset.metadata.contentType : null,
        ),
      });

      const body: MediaDownloadSuccess = {
        success: true,
        data: download,
      };

      return NextResponse.json(body, { status: 200 });
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
