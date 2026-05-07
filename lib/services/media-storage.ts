import type { SupabaseClient } from "@supabase/supabase-js";
import { createActivityEvent } from "@/lib/services/activity";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv, isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";
import { mockMediaAssets } from "@/lib/data/media";
import type { Database, MediaAssetRow } from "@/lib/types/database";
import type {
  BuildStoragePathInput,
  BuildStoragePathResult,
  CreateMediaAssetInput,
  CreateMediaAssetRecordInput,
  DownloadEvent,
  DownloadUrlResult,
  FinalizeUploadedMediaAssetInput,
  MediaAsset,
  MediaAssetMetadata,
  MediaStatus,
  MediaType,
  RegisterStoredMediaAssetInput,
  SignedDownloadUrlInput,
  SignedUploadUrlInput,
  UpdateMediaAssetRecordInput,
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
const mediaAssetsStore = mockMediaAssets.map((asset) => ({ ...asset, metadata: { ...asset.metadata } }));
const downloadEventsStore: DownloadEvent[] = [];
const storedMediaIndex = new Map<string, StoredMediaRecord>();

function createMediaId() {
  return `media_${crypto.randomUUID().slice(0, 6)}`;
}

function createUuid() {
  return crypto.randomUUID();
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function asMetadata(value: unknown): MediaAssetMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) } as MediaAssetMetadata;
  }

  return {};
}

function mapRowToMediaAsset(row: MediaAssetRow): MediaAsset {
  const metadata = asMetadata(row.metadata);
  const campaignId =
    typeof metadata.campaignId === "string" ? metadata.campaignId : null;

  return {
    id: row.id,
    externalId: row.external_id ?? null,
    userId: row.user_id,
    type: row.media_type,
    title: row.title,
    prompt: row.prompt,
    thumbnailUrl: row.thumbnail_url ?? getDefaultThumbnail(row.media_type),
    mediaUrl: row.media_url ?? getDefaultMediaPreview(row.media_type),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    thumbnailBucket: row.thumbnail_bucket,
    thumbnailPath: row.thumbnail_path,
    status: row.status,
    assignedAgentId: row.assigned_agent_id ?? "image-generation",
    generationJobId: row.generation_job_id,
    campaignId,
    metadata: { ...metadata, source: "supabase" },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: "supabase",
  };
}

async function getAuthenticatedSupabaseContext(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string;
} | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { supabase, userId: user.id };
  } catch {
    return null;
  }
}

function syncLocalMediaAsset(assetId: string, input: RegisterStoredMediaAssetInput): MediaAsset {
  const existingAsset = getMediaAssetById(assetId);
  const timestamp = nowIso();
  const thumbnailUrl = input.thumbnailUrl ?? getDefaultThumbnail(input.type);
  const mediaUrl = input.mediaUrl ?? getDefaultMediaPreview(input.type);
  const userId = input.userId || DEFAULT_MOCK_USER_ID;
  const externalId = input.externalId ?? null;

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
    existingAsset.storageBucket = input.storageBucket ?? existingAsset.storageBucket;
    existingAsset.storagePath = input.storagePath ?? existingAsset.storagePath;
    existingAsset.thumbnailBucket = input.thumbnailBucket ?? existingAsset.thumbnailBucket;
    existingAsset.thumbnailPath = input.thumbnailPath ?? existingAsset.thumbnailPath;
    existingAsset.userId = userId;
    existingAsset.externalId = externalId ?? existingAsset.externalId ?? null;
    existingAsset.updatedAt = timestamp;

    return existingAsset;
  }

  const asset: MediaAsset = {
    id: assetId,
    externalId,
    userId,
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    thumbnailUrl,
    mediaUrl,
    storageBucket: input.storageBucket ?? null,
    storagePath: input.storagePath ?? null,
    thumbnailBucket: input.thumbnailBucket ?? null,
    thumbnailPath: input.thumbnailPath ?? null,
    status: input.status ?? "processing",
    assignedAgentId: input.assignedAgentId,
    generationJobId: input.generationJobId ?? null,
    campaignId: input.campaignId ?? null,
    metadata: { source: "mock" },
    createdAt: timestamp,
    updatedAt: timestamp,
    source: "mock",
  };

  mediaAssetsStore.unshift(asset);

  return asset;
}

export function getMediaAssets(): MediaAsset[] {
  return [...mediaAssetsStore].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getMediaAssetById(id: string): MediaAsset | null {
  return (
    mediaAssetsStore.find((asset) => asset.id === id || asset.externalId === id) ?? null
  );
}

export function createMediaAsset(input: CreateMediaAssetInput): MediaAsset {
  const timestamp = nowIso();
  const asset: MediaAsset = {
    id: createMediaId(),
    externalId: null,
    userId: DEFAULT_MOCK_USER_ID,
    type: input.type,
    title: input.title,
    prompt: input.prompt,
    thumbnailUrl: input.thumbnailUrl,
    mediaUrl: input.mediaUrl,
    storageBucket: null,
    storagePath: null,
    thumbnailBucket: null,
    thumbnailPath: null,
    status: input.status ?? "generated",
    assignedAgentId: input.assignedAgentId,
    generationJobId: input.generationJobId ?? null,
    campaignId: input.campaignId ?? null,
    metadata: { source: "mock" },
    createdAt: timestamp,
    updatedAt: timestamp,
    source: "mock",
  };

  mediaAssetsStore.unshift(asset);

  return asset;
}

export function updateMediaAssetStatus(id: string, status: MediaStatus): MediaAsset | null {
  const asset = mediaAssetsStore.find((entry) => entry.id === id || entry.externalId === id);

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
      storagePath: resolved.path,
      signedUrl: `mock://storage-upload/${resolved.bucket}/${resolved.path}`,
      uploadUrl: `mock://storage-upload/${resolved.bucket}/${resolved.path}`,
      token: null,
      expiresAt: "mock-no-expiration",
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
    storagePath: resolved.path,
    signedUrl: data.signedUrl,
    uploadUrl: data.signedUrl,
    token: data.token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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

  const asset = syncLocalMediaAsset(assetId, {
    ...input,
    storageBucket: mediaLocation.bucket,
    storagePath: mediaLocation.path,
  });

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

  const storedMedia = resolveStoredMediaRecord(asset.id);

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

  const assetIndex = mediaAssetsStore.findIndex((entry) => entry.id === asset.id);

  if (assetIndex >= 0) {
    mediaAssetsStore.splice(assetIndex, 1);
  }

  storedMediaIndex.delete(asset.id);

  return true;
}

export function recordDownloadEvent(mediaAssetId: string): DownloadEvent | null {
  const asset = getMediaAssetById(mediaAssetId);
  const storedMedia = asset ? resolveStoredMediaRecord(asset.id) : null;

  if (!asset) {
    return null;
  }

  const sourcePath = storedMedia?.mediaPath ?? asset.storagePath ?? asset.mediaUrl ?? asset.thumbnailUrl;
  const event: DownloadEvent = {
    id: createDownloadEventId(),
    mediaAssetId: asset.id,
    userId: storedMedia?.userId ?? asset.userId ?? DEFAULT_MOCK_USER_ID,
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
    relatedEntityId: asset.id,
    actor: asset.assignedAgentId,
  });

  return event;
}

export async function getMediaAssetDownload(mediaAssetId: string): Promise<DownloadUrlResult | null> {
  const asset = getMediaAssetById(mediaAssetId);

  if (!asset) {
    return null;
  }

  const storedMedia = resolveStoredMediaRecord(asset.id);
  let download: DownloadUrlResult;

  const bucket = storedMedia?.mediaBucket ?? asset.storageBucket;
  const path = storedMedia?.mediaPath ?? asset.storagePath;

  if (bucket && path) {
    download = await createSignedDownloadUrl({
      bucket,
      path,
    });
  } else {
    const fallbackPath = asset.mediaUrl || asset.thumbnailUrl;
    download = {
      downloadUrl: fallbackPath,
      fileName: getFileNameFromPath(fallbackPath),
      expiresAt: "mock-no-expiration",
    };
  }

  recordDownloadEvent(asset.id);

  return download;
}

export async function createDownloadUrl(mediaAssetId: string): Promise<DownloadUrlResult | null> {
  return getMediaAssetDownload(mediaAssetId);
}

function buildInsertPayload(input: CreateMediaAssetRecordInput, userId: string) {
  const baseMetadata = input.metadata ?? {};
  const metadata: MediaAssetMetadata = { ...baseMetadata, source: "supabase" };

  if (input.campaignId) {
    metadata.campaignId = input.campaignId;
  }

  const id = input.assetId && isUuid(input.assetId) ? input.assetId : undefined;

  return {
    id,
    user_id: userId,
    external_id: input.externalId ?? null,
    title: input.title,
    prompt: input.prompt,
    media_type: input.type,
    status: input.status ?? "ready",
    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    thumbnail_bucket: input.thumbnailBucket ?? null,
    thumbnail_path: input.thumbnailPath ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    media_url: input.mediaUrl ?? null,
    content_type: input.contentType ?? null,
    file_name: input.fileName ?? null,
    assigned_agent_id: input.assignedAgentId,
    generation_job_id: input.generationJobId ?? null,
    metadata: metadata as unknown as Database["public"]["Tables"]["media_assets"]["Insert"]["metadata"],
  };
}

export async function createMediaAssetRecord(input: CreateMediaAssetRecordInput): Promise<MediaAsset> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    return registerStoredMediaAsset({
      userId: input.userId,
      assetId: input.assetId,
      externalId: input.externalId ?? null,
      type: input.type,
      title: input.title,
      prompt: input.prompt,
      assignedAgentId: input.assignedAgentId,
      generationJobId: input.generationJobId ?? null,
      campaignId: input.campaignId ?? null,
      status: input.status ?? "ready",
      storageBucket: input.storageBucket ?? null,
      storagePath: input.storagePath ?? null,
      thumbnailBucket: input.thumbnailBucket ?? null,
      thumbnailPath: input.thumbnailPath ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      mediaUrl: input.mediaUrl ?? null,
    });
  }

  const payload = buildInsertPayload({ ...input, userId: auth.userId }, auth.userId);

  const { data, error } = await auth.supabase
    .from("media_assets")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to persist media asset.");
  }

  return mapRowToMediaAsset(data as MediaAssetRow);
}

export async function updateMediaAssetRecord(
  id: string,
  input: UpdateMediaAssetRecordInput,
): Promise<MediaAsset | null> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    const asset = mediaAssetsStore.find((entry) => entry.id === id || entry.externalId === id);

    if (!asset) {
      return null;
    }

    Object.assign(asset, {
      title: input.title ?? asset.title,
      prompt: input.prompt ?? asset.prompt,
      status: input.status ?? asset.status,
      storageBucket: input.storageBucket ?? asset.storageBucket,
      storagePath: input.storagePath ?? asset.storagePath,
      thumbnailBucket: input.thumbnailBucket ?? asset.thumbnailBucket,
      thumbnailPath: input.thumbnailPath ?? asset.thumbnailPath,
      thumbnailUrl: input.thumbnailUrl ?? asset.thumbnailUrl,
      mediaUrl: input.mediaUrl ?? asset.mediaUrl,
      assignedAgentId: input.assignedAgentId ?? asset.assignedAgentId,
      generationJobId: input.generationJobId ?? asset.generationJobId,
      campaignId: input.campaignId ?? asset.campaignId,
      externalId: input.externalId ?? asset.externalId ?? null,
      metadata: { ...asset.metadata, ...(input.metadata ?? {}) },
      updatedAt: nowIso(),
    });

    return asset;
  }

  const updatePayload: Record<string, unknown> = {};

  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.prompt !== undefined) updatePayload.prompt = input.prompt;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.storageBucket !== undefined) updatePayload.storage_bucket = input.storageBucket;
  if (input.storagePath !== undefined) updatePayload.storage_path = input.storagePath;
  if (input.thumbnailBucket !== undefined) updatePayload.thumbnail_bucket = input.thumbnailBucket;
  if (input.thumbnailPath !== undefined) updatePayload.thumbnail_path = input.thumbnailPath;
  if (input.thumbnailUrl !== undefined) updatePayload.thumbnail_url = input.thumbnailUrl;
  if (input.mediaUrl !== undefined) updatePayload.media_url = input.mediaUrl;
  if (input.contentType !== undefined) updatePayload.content_type = input.contentType;
  if (input.fileName !== undefined) updatePayload.file_name = input.fileName;
  if (input.assignedAgentId !== undefined) updatePayload.assigned_agent_id = input.assignedAgentId;
  if (input.generationJobId !== undefined) updatePayload.generation_job_id = input.generationJobId;
  if (input.externalId !== undefined) updatePayload.external_id = input.externalId;
  if (input.metadata !== undefined) updatePayload.metadata = input.metadata;

  const filterColumn = isUuid(id) ? "id" : "external_id";
  const { data, error } = await auth.supabase
    .from("media_assets")
    .update(updatePayload)
    .eq(filterColumn, id)
    .eq("user_id", auth.userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRowToMediaAsset(data as MediaAssetRow);
}

export async function getUserMediaAssets(userId?: string): Promise<MediaAsset[]> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    if (userId) {
      return getMediaAssets().filter((asset) => asset.userId === userId);
    }

    return getMediaAssets();
  }

  const targetUserId = userId ?? auth.userId;

  if (targetUserId !== auth.userId) {
    return [];
  }

  const { data, error } = await auth.supabase
    .from("media_assets")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as MediaAssetRow[]).map(mapRowToMediaAsset);
}

export async function getUserMediaAssetById(userId: string, id: string): Promise<MediaAsset | null> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    const asset = getMediaAssetById(id);

    if (!asset) {
      return null;
    }

    if (asset.userId && userId && asset.userId !== userId && asset.userId !== DEFAULT_MOCK_USER_ID) {
      return null;
    }

    return asset;
  }

  if (userId !== auth.userId) {
    return null;
  }

  const filterColumn = isUuid(id) ? "id" : "external_id";
  const { data, error } = await auth.supabase
    .from("media_assets")
    .select("*")
    .eq(filterColumn, id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRowToMediaAsset(data as MediaAssetRow);
}

export async function deleteMediaAssetRecord(userId: string, id: string): Promise<boolean> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    const asset = getMediaAssetById(id);

    if (!asset) {
      return false;
    }

    if (asset.userId && userId && asset.userId !== userId && asset.userId !== DEFAULT_MOCK_USER_ID) {
      return false;
    }

    return deleteStoredMediaAsset(asset.id);
  }

  if (userId !== auth.userId) {
    return false;
  }

  const existing = await getUserMediaAssetById(auth.userId, id);

  if (!existing) {
    return false;
  }

  if (isServiceRoleConfigured()) {
    const storage = createSupabaseServiceRoleClient();
    const removals: Promise<{ error: { message: string } | null }>[] = [];

    if (existing.storageBucket && existing.storagePath) {
      removals.push(storage.storage.from(existing.storageBucket).remove([existing.storagePath]));
    }

    if (existing.thumbnailBucket && existing.thumbnailPath) {
      removals.push(storage.storage.from(existing.thumbnailBucket).remove([existing.thumbnailPath]));
    }

    if (removals.length > 0) {
      await Promise.all(removals);
    }
  }

  const { error } = await auth.supabase
    .from("media_assets")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", auth.userId);

  return !error;
}

export async function finalizeUploadedMediaAsset(
  input: FinalizeUploadedMediaAssetInput,
): Promise<MediaAsset> {
  const status: MediaStatus = input.status ?? "ready";
  const auth = await getAuthenticatedSupabaseContext();
  const userId = auth?.userId ?? DEFAULT_MOCK_USER_ID;
  const assignedAgentId = input.assignedAgentId ?? "image-generation";

  return createMediaAssetRecord({
    userId,
    assetId: input.assetId,
    externalId: input.externalId ?? null,
    type: input.assetType,
    title: input.title,
    prompt: input.prompt,
    storageBucket: input.storageBucket,
    storagePath: input.storagePath,
    thumbnailBucket: input.thumbnailBucket ?? null,
    thumbnailPath: input.thumbnailPath ?? null,
    contentType: input.contentType,
    fileName: input.fileName,
    assignedAgentId,
    generationJobId: input.generationJobId ?? null,
    campaignId: input.campaignId ?? null,
    status,
  });
}

export async function recordDbDownloadEvent(input: {
  mediaAssetId: string;
  fileName: string;
  fileType: string;
}): Promise<boolean> {
  const auth = await getAuthenticatedSupabaseContext();

  if (!auth) {
    return false;
  }

  const { error } = await auth.supabase.from("download_events").insert({
    user_id: auth.userId,
    media_asset_id: input.mediaAssetId,
    file_name: input.fileName,
    file_type: input.fileType,
    downloaded_at: nowIso(),
    metadata: {},
  });

  return !error;
}

export function generateMediaAssetUuid() {
  return createUuid();
}

export function getMediaFileExtension(type: MediaType) {
  return getMediaExtension(type);
}

export { isSupabaseStorageReady, isSupabaseConfigured };
