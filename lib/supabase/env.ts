export interface SupabasePublicEnv {
  siteUrl: string | null;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  mediaStorageBucket: string;
  mediaThumbnailsBucket: string;
  campaignExportsBucket: string;
  mediaStorageProvider: string;
}

export interface SupabaseServiceEnv extends SupabasePublicEnv {
  serviceRoleKey: string | null;
  openAiKeyConfigured: boolean;
}

export interface RuntimeStatus {
  supabase: boolean;
  serviceRole: boolean;
  storageReady: boolean;
  openAi: boolean;
  storageBucket: string;
  storageProvider: string;
  siteUrlConfigured: boolean;
  authLockEnabled: boolean;
  agentPipeline: boolean;
  mockMode: boolean;
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    siteUrl: normalizeEnvValue(process.env.NEXT_PUBLIC_SITE_URL),
    supabaseUrl: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    mediaStorageBucket: normalizeEnvValue(process.env.MEDIA_STORAGE_BUCKET) ?? "media-assets",
    mediaThumbnailsBucket: normalizeEnvValue(process.env.MEDIA_THUMBNAILS_BUCKET) ?? "media-thumbnails",
    campaignExportsBucket: normalizeEnvValue(process.env.CAMPAIGN_EXPORTS_BUCKET) ?? "campaign-exports",
    mediaStorageProvider: normalizeEnvValue(process.env.MEDIA_STORAGE_PROVIDER) ?? "supabase",
  };
}

export function getSupabaseServiceEnv(): SupabaseServiceEnv {
  const publicEnv = getSupabasePublicEnv();

  return {
    ...publicEnv,
    serviceRoleKey: normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openAiKeyConfigured: Boolean(normalizeEnvValue(process.env.OPENAI_API_KEY)),
  };
}

export function isSupabaseConfigured() {
  const env = getSupabasePublicEnv();
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isServiceRoleConfigured() {
  const env = getSupabaseServiceEnv();
  return Boolean(env.supabaseUrl && env.serviceRoleKey);
}

export function getPublicSiteUrl() {
  return getSupabasePublicEnv().siteUrl ?? "http://localhost:3000";
}

export function getRuntimeStatus(): RuntimeStatus {
  const publicEnv = getSupabasePublicEnv();
  const serviceEnv = getSupabaseServiceEnv();
  const supabaseReady = isSupabaseConfigured();
  const serviceRoleReady = isServiceRoleConfigured();

  return {
    supabase: supabaseReady,
    serviceRole: serviceRoleReady,
    storageReady:
      serviceRoleReady &&
      Boolean(publicEnv.mediaStorageBucket) &&
      Boolean(publicEnv.mediaThumbnailsBucket) &&
      Boolean(publicEnv.campaignExportsBucket),
    openAi: serviceEnv.openAiKeyConfigured,
    storageBucket: publicEnv.mediaStorageBucket,
    storageProvider: publicEnv.mediaStorageProvider,
    siteUrlConfigured: Boolean(publicEnv.siteUrl),
    authLockEnabled: supabaseReady,
    agentPipeline: true,
    mockMode: !supabaseReady,
  };
}
