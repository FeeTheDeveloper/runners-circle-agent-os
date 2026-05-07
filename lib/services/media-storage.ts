import { mockMediaAssets } from "@/lib/data/media";
import type { CreateMediaAssetInput, DownloadEvent, DownloadUrlResult, MediaAsset, MediaStatus } from "@/lib/types/media";

const mediaAssetsStore = [...mockMediaAssets];
const downloadEventsStore: DownloadEvent[] = [];

function createMediaId() {
  return `media_${crypto.randomUUID().slice(0, 6)}`;
}

function createDownloadEventId() {
  return `download_${crypto.randomUUID().slice(0, 8)}`;
}

function toIsoNow() {
  return new Date().toISOString();
}

function getFileNameFromPath(path: string) {
  const lastSegment = path.split("/").pop() ?? "generated-asset.bin";
  return lastSegment.startsWith("runners-circle-") ? lastSegment : `runners-circle-${lastSegment}`;
}

function getFileTypeFromPath(path: string) {
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }

  if (path.endsWith(".mp4")) {
    return "video/mp4";
  }

  return "application/octet-stream";
}

export function getMediaAssets(): MediaAsset[] {
  return [...mediaAssetsStore].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getMediaAssetById(id: string): MediaAsset | null {
  return mediaAssetsStore.find((asset) => asset.id === id) ?? null;
}

export function createMediaAsset(input: CreateMediaAssetInput): MediaAsset {
  const timestamp = toIsoNow();
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

  // TODO: Persist new media asset records to Supabase Postgres once the database layer is enabled.
  // TODO: Store media file metadata and object paths in Supabase Storage when uploads are connected.

  return asset;
}

export function updateMediaAssetStatus(id: string, status: MediaStatus): MediaAsset | null {
  const asset = mediaAssetsStore.find((entry) => entry.id === id);

  if (!asset) {
    return null;
  }

  asset.status = status;
  asset.updatedAt = toIsoNow();

  // TODO: Sync media status changes to Supabase Postgres when persistence is enabled.

  return asset;
}

export function createDownloadUrl(mediaAssetId: string): DownloadUrlResult | null {
  const asset = getMediaAssetById(mediaAssetId);

  if (!asset) {
    return null;
  }

  // TODO: Replace this placeholder URL response with a Supabase Storage signed URL.
  return {
    downloadUrl: asset.mediaUrl || asset.thumbnailUrl,
    fileName: getFileNameFromPath(asset.mediaUrl || asset.thumbnailUrl),
    expiresAt: "mock-no-expiration",
  };
}

export function recordDownloadEvent(mediaAssetId: string): DownloadEvent | null {
  const asset = getMediaAssetById(mediaAssetId);

  if (!asset) {
    return null;
  }

  const event: DownloadEvent = {
    id: createDownloadEventId(),
    mediaAssetId,
    userId: "mock-operator",
    downloadedAt: toIsoNow(),
    fileName: getFileNameFromPath(asset.mediaUrl || asset.thumbnailUrl),
    fileType: getFileTypeFromPath(asset.mediaUrl || asset.thumbnailUrl),
  };

  downloadEventsStore.unshift(event);

  // TODO: Persist download events to Supabase Postgres once analytics persistence is enabled.

  return event;
}
