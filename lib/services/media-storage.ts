import { createActivityEvent } from "@/lib/services/activity";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv, isServiceRoleConfigured } from "@/lib/supabase/env";
import { mockMediaAssets } from "@/lib/data/media";
import type {
  BuildStoragePathInput,
  BuildStoragePathResult,
  CreateMediaAssetInput,
  DownloadEvent,
  DownloadUrlResult,
  MediaAsset,
  MediaStatus,
  MediaType,
  RegisterStoredMediaAssetInput,
  SignedDownloadUrlInput,
  SignedUploadUrlInput,
  UploadUrlResult,
} from "@/lib/types/media";

interface StoredMediaRecord {
  assetId: string;
  userId: string;
  mediaBucket: string | null;
  mediaPath: string | null;
  thumbnailBucket: string | null;
  thumbnailPath: string | null;
}

const DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 15;
const DEFAULT_MOCK_USER_ID = "mock-user";
const mediaAssetsStore = mockMediaAssets.map((asset) => ({ ...asset }));
const downloadEventsStore: DownloadEvent[] = [];
const storedMediaIndex = new Map<string, StoredMediaRecord>();

function createMediaId() {
  return `media_${crypto.randomUUID().slice(0, 6)}`;
}

function createDownloadEventId() {
  return `download_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function isSupabaseStorageReady() {
  const env = getSupabasePublicEnv();
  return env.mediaStorageProvider === "supabase" && isServiceRoleConfigured();
}

function sanitizePathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getDefaultThumbnail(type: MediaType) {
  return type === "video"
    ? "/assets/placeholders/generated-video-1.svg"
    : "/assets/placeholders/generated-image-1.svg";
}

function getDefaultMediaPreview(type: MediaType) {
  return type === "video"
    ? "/assets/placeholders/generated-video-1.svg"
    : "/assets/placeholders/generated-image-1.svg";
}

function getMediaFolder(type: MediaType) {
  return type === "video" ? "videos" : "images";
}

function getMediaExtension(type: MediaType) {
  return type === "video" ? "mp4" : "png";
}

function getFileNameFromPath(path: string) {
  const lastSegment = path.split("/").pop() ?? "generated-asset.bin";
  return lastSegment.startsWith("runners-circle-") ? lastSegment : `runners-circle-${lastSegment}`;
}

function getFileTypeFromPath(path: string) {
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (path.endsWith(".png")) {
    return "image/png";
  }

  if (path.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (path.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

function resolveStoredMediaRecord(assetId: string): StoredMediaRecord | null {
  return storedMediaIndex.get(assetId) ?? null;
}

function upsertStoredMediaRecord(record: StoredMediaRecord) {
  storedMediaIndex.set(record.assetId, record);
}

function syncLocalMediaAsset(assetId: string, input: RegisterStoredMediaAssetInput): MediaAsset {
  const existingAsset = getMediaAssetById(assetId);
  const timestamp = nowIso();
  const thumbnailUrl = input.thumbnailUrl ?? getDefaultThumbnail(input.type);
  const mediaUrl = input.mediaUrl ?? getDefaultMediaPreview(input.type);

  if (existingAsset) {
    existingAsset.type = input.type;
    existingAsset.title = input.title;
    existingAsset.prompt = input.prompt;
    existingAsset.thumbnailUrl = thumbnailUrl;
    existingAsset.mediaUrl = mediaUrl;
    existingAsset.status = input.status ?? existingAsset.status;
    existingAsset.assignedAgentId = input.assignedAgentId;
    existingAsset.generationJobId = input.generationJobId ?? existingAsset.generationJobId;
    existingAsset.campaignId = input.campaignId ?? existingAsset.campaignId;
    existingAsset.updatedAt = timestamp;

    return existingAsset;
  }

  const asset: MediaAsset = {
    id: assetId,
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    thumbnailUrl,
    mediaUrl,
    status: input.status ?? "processing",
    assignedAgentId: input.assignedAgentId,
    generationJobId: input.generationJobId ?? null,
    campaignId: input.campaignId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  mediaAssetsStore.unshift(asset);

  return asset;
}

export function getMediaAssets(): MediaAsset[] {
  return [...mediaAssetsStore].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getMediaAssetById(id: string): MediaAsset | null {
  return mediaAssetsStore.find((asset) => asset.id === id) ?? null;
}

export function createMediaAsset(input: CreateMediaAssetInput): MediaAsset {
  const timestamp = nowIso();
  const asset: MediaAsset = {
    id: createMediaId(),
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    thumbnailUrl: input.thumbnailUrl,
    mediaUrl: input.mediaUrl,
    status: input.status ?? "generated",
    assignedAgentId: input.assignedAgentId,
    generationJobId: input.generationJobId ?? null,
    campaignId: input.campaignId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  mediaAssetsStore.unshift(asset);

  return asset;
}

export function updateMediaAssetStatus(id: string, status: MediaStatus): MediaAsset | null {
  const asset = mediaAssetsStore.find((entry) => entry.id === id);

  if (!asset) {
    return null;
  }

  asset.status = status;
  asset.updatedAt = nowIso();

  return asset;
}

export function buildStoragePath(input: BuildStoragePathInput): BuildStoragePathResult {
  const env = getSupabasePublicEnv();
  const userId = sanitizePathSegment(input.userId || DEFAULT_MOCK_USER_ID);
  const assetId = sanitizePathSegment(input.assetId);

  if (input.kind === "media") {
    if (!input.mediaType) {
      throw new Error("Media type is required to build a media storage path.");
    }

    const folder = getMediaFolder(input.mediaType);
    const extension = getMediaExtension(input.mediaType);
    const path = `${userId}/${folder}/${assetId}.${extension}`;

    return {
      bucket: env.mediaStorageBucket,
      path,
      fileName: getFileNameFromPath(path),
    };
  }

  if (input.kind === "thumbnail") {
    const path = `${userId}/${assetId}.jpg`;

    return {
      bucket: env.mediaThumbnailsBucket,
      path,
      fileName: getFileNameFromPath(path),
    };
  }

  if (!input.campaignId) {
    throw new Error("Campaign id is required to build a campaign export path.");
  }

  const campaignId = sanitizePathSegment(input.campaignId);
  const path = `${userId}/${campaignId}/caption-pack.txt`;

  return {
    bucket: env.campaignExportsBucket,
    path,
    fileName: getFileNameFromPath(path),
  };
}

export async function createSignedUploadUrl(input: SignedUploadUrlInput): Promise<UploadUrlResult> {
  const resolved = buildStoragePath({
    kind: "media",
    userId: input.userId,
    assetId: input.assetId,
    mediaType: input.mediaType,
  });

  if (!isSupabaseStorageReady()) {
    return {
      assetId: input.assetId,
      bucket: resolved.bucket,
      path: resolved.path,
      uploadUrl: `mock://storage-upload/${resolved.bucket}/${resolved.path}`,
      token: null,
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from(resolved.bucket).createSignedUploadUrl(resolved.path);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create a signed upload URL.");
  }

  return {
    assetId: input.assetId,
    bucket: resolved.bucket,
    path: resolved.path,
    uploadUrl: data.signedUrl,
    token: data.token,
  };
}

export async function createSignedDownloadUrl(input: SignedDownloadUrlInput): Promise<DownloadUrlResult> {
  const fileName = input.fileName ?? getFileNameFromPath(input.path);
  const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS;

  if (!isSupabaseStorageReady()) {
    return {
      downloadUrl: `mock://storage-download/${input.bucket}/${input.path}`,
      fileName,
      expiresAt: "mock-no-expiration",
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from(input.bucket).createSignedUrl(input.path, expiresInSeconds, {
    download: fileName,
  });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create a signed download URL.");
  }

  return {
    downloadUrl: data.signedUrl,
    fileName,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  };
}

export function registerStoredMediaAsset(input: RegisterStoredMediaAssetInput): MediaAsset {
  const assetId = input.assetId ?? createMediaId();
  const mediaLocation =
    input.storageBucket && input.storagePath
      ? {
          bucket: input.storageBucket,
          path: input.storagePath,
        }
      : buildStoragePath({
          kind: "media",
          userId: input.userId,
          assetId,
          mediaType: input.type,
        });

  const asset = syncLocalMediaAsset(assetId, input);

  upsertStoredMediaRecord({
    assetId,
    userId: input.userId || DEFAULT_MOCK_USER_ID,
    mediaBucket: mediaLocation.bucket,
    mediaPath: mediaLocation.path,
    thumbnailBucket: input.thumbnailBucket ?? null,
    thumbnailPath: input.thumbnailPath ?? null,
  });

  return asset;
}

export async function deleteStoredMediaAsset(mediaAssetId: string): Promise<boolean> {
  const asset = getMediaAssetById(mediaAssetId);

  if (!asset) {
    return false;
  }

  const storedMedia = resolveStoredMediaRecord(mediaAssetId);

  if (storedMedia && isSupabaseStorageReady()) {
    const supabase = createSupabaseServiceRoleClient();
    const deleteTargets = [
      storedMedia.mediaBucket && storedMedia.mediaPath
        ? supabase.storage.from(storedMedia.mediaBucket).remove([storedMedia.mediaPath])
        : null,
      storedMedia.thumbnailBucket && storedMedia.thumbnailPath
        ? supabase.storage.from(storedMedia.thumbnailBucket).remove([storedMedia.thumbnailPath])
        : null,
    ].filter(Boolean) as Promise<{ error: { message: string } | null }>[];

    const results = await Promise.all(deleteTargets);

    if (results.some((result) => result.error)) {
      return false;
    }
  }

  const assetIndex = mediaAssetsStore.findIndex((entry) => entry.id === mediaAssetId);

  if (assetIndex >= 0) {
    mediaAssetsStore.splice(assetIndex, 1);
  }

  storedMediaIndex.delete(mediaAssetId);

  return true;
}

export function recordDownloadEvent(mediaAssetId: string): DownloadEvent | null {
  const asset = getMediaAssetById(mediaAssetId);
  const storedMedia = resolveStoredMediaRecord(mediaAssetId);

  if (!asset) {
    return null;
  }

  const sourcePath = storedMedia?.mediaPath ?? asset.mediaUrl ?? asset.thumbnailUrl;
  const event: DownloadEvent = {
    id: createDownloadEventId(),
    mediaAssetId,
    userId: storedMedia?.userId ?? DEFAULT_MOCK_USER_ID,
    downloadedAt: nowIso(),
    fileName: getFileNameFromPath(sourcePath),
    fileType: getFileTypeFromPath(sourcePath),
  };

  downloadEventsStore.unshift(event);
  createActivityEvent({
    type: "media_downloaded",
    severity: "info",
    title: `${asset.title} download prepared`,
    description: `Download handoff ready for ${event.fileName}.`,
    relatedEntityType: "media_asset",
    relatedEntityId: mediaAssetId,
    actor: asset.assignedAgentId,
  });

  return event;
}

export async function getMediaAssetDownload(mediaAssetId: string): Promise<DownloadUrlResult | null> {
  const asset = getMediaAssetById(mediaAssetId);

  if (!asset) {
    return null;
  }

  const storedMedia = resolveStoredMediaRecord(mediaAssetId);
  let download: DownloadUrlResult;

  if (storedMedia?.mediaBucket && storedMedia.mediaPath) {
    download = await createSignedDownloadUrl({
      bucket: storedMedia.mediaBucket,
      path: storedMedia.mediaPath,
    });
  } else {
    const fallbackPath = asset.mediaUrl || asset.thumbnailUrl;
    download = {
      downloadUrl: fallbackPath,
      fileName: getFileNameFromPath(fallbackPath),
      expiresAt: "mock-no-expiration",
    };
  }

  recordDownloadEvent(mediaAssetId);

  return download;
}

export async function createDownloadUrl(mediaAssetId: string): Promise<DownloadUrlResult | null> {
  return getMediaAssetDownload(mediaAssetId);
}
