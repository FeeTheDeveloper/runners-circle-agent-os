import { defaultBrandModeSettings, defaultBrandProfile } from "@/lib/data/default-brand";
import {
  buildCampaignModifier,
  buildImagePromptModifier,
  buildPromotionModifier,
  buildVideoPromptModifier,
} from "@/lib/services/prompt-modifiers";
import { scoreBrandConsistency } from "@/lib/services/brand-validation";
import type {
  BrandModeSettings,
  BrandProfile,
  BrandPromptModifierResult,
  BrandValidationResult,
  BrandVoiceApplicationResult,
  UpdateBrandProfileInput,
} from "@/lib/types/brand";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cloneProfile(profile: BrandProfile): BrandProfile {
  return {
    ...profile,
    keywords: [...profile.keywords],
    bannedWords: [...profile.bannedWords],
    preferredPlatforms: [...profile.preferredPlatforms],
  };
}

function cloneModeSettings(settings: BrandModeSettings): BrandModeSettings {
  return { ...settings };
}

function resolveUserId(userId?: string | null) {
  return userId?.trim() || "mock-user";
}

const brandProfileStore = new Map<string, BrandProfile>([[resolveUserId(defaultBrandProfile.userId), cloneProfile(defaultBrandProfile)]]);
const brandModeSettingsStore = new Map<string, BrandModeSettings>([
  [resolveUserId(defaultBrandProfile.userId), cloneModeSettings(defaultBrandModeSettings)],
]);

function getStoredProfile(userId?: string | null) {
  return brandProfileStore.get(resolveUserId(userId)) ?? null;
}

function getStoredModeSettings(userId?: string | null) {
  return brandModeSettingsStore.get(resolveUserId(userId)) ?? null;
}

function normalizeCommaList(value: string | string[]) {
  const list = Array.isArray(value) ? value : value.split(",");

  return list.map((item) => item.trim()).filter(Boolean);
}

function sanitizeCopy(content: string, bannedWords: string[]) {
  let next = content;
  const removedBannedWords: string[] = [];

  for (const bannedWord of bannedWords) {
    const pattern = new RegExp(`\\b${bannedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");

    if (pattern.test(next)) {
      removedBannedWords.push(bannedWord);
      next = next.replace(pattern, "");
    }
  }

  return {
    content: next.replace(/\s+/g, " ").trim(),
    removedBannedWords,
  };
}

export function getDefaultBrandProfile() {
  return cloneProfile(defaultBrandProfile);
}

export function getBrandProfile(userId?: string | null) {
  const profile = getStoredProfile(userId);

  if (profile) {
    return cloneProfile(profile);
  }

  const userScopedProfile = {
    ...cloneProfile(defaultBrandProfile),
    userId: resolveUserId(userId),
  };

  brandProfileStore.set(userScopedProfile.userId, userScopedProfile);
  return cloneProfile(userScopedProfile);
}

export function getBrandModeSettings(userId?: string | null) {
  const settings = getStoredModeSettings(userId);

  if (settings) {
    return cloneModeSettings(settings);
  }

  const scopedSettings = cloneModeSettings(defaultBrandModeSettings);
  brandModeSettingsStore.set(resolveUserId(userId), scopedSettings);
  return cloneModeSettings(scopedSettings);
}

export function updateBrandProfile(input: UpdateBrandProfileInput) {
  const userId = resolveUserId(input.userId);
  const currentProfile = getBrandProfile(userId);
  const mergedProfile: BrandProfile = {
    ...currentProfile,
    ...input.profile,
    userId,
    slug: slugify(input.profile.slug ?? input.profile.name ?? currentProfile.name),
    keywords:
      input.profile.keywords !== undefined
        ? normalizeCommaList(input.profile.keywords)
        : currentProfile.keywords,
    bannedWords:
      input.profile.bannedWords !== undefined
        ? normalizeCommaList(input.profile.bannedWords)
        : currentProfile.bannedWords,
    preferredPlatforms:
      input.profile.preferredPlatforms !== undefined
        ? [...input.profile.preferredPlatforms]
        : currentProfile.preferredPlatforms,
    updatedAt: nowIso(),
  };
  const currentSettings = getBrandModeSettings(userId);
  const mergedSettings: BrandModeSettings = {
    ...currentSettings,
    ...(input.modeSettings ?? {}),
  };

  brandProfileStore.set(userId, cloneProfile(mergedProfile));
  brandModeSettingsStore.set(userId, cloneModeSettings(mergedSettings));

  // TODO: Persist brand profiles and mode settings to Supabase once the brand table contract is finalized.

  return {
    brandProfile: cloneProfile(mergedProfile),
    brandModeSettings: cloneModeSettings(mergedSettings),
  };
}

export function getBrandPromptModifiers(userId?: string | null) {
  const brandProfile = getBrandProfile(userId);
  const brandModeSettings = getBrandModeSettings(userId);

  return {
    brandProfile,
    brandModeSettings,
    image: buildImagePromptModifier({
      basePrompt: "Brand-aware image direction.",
      brandProfile,
      brandModeSettings,
    }).injectedBrandDirection,
    video: buildVideoPromptModifier({
      basePrompt: "Brand-aware video direction.",
      brandProfile,
      brandModeSettings,
    }).injectedBrandDirection,
    campaign: buildCampaignModifier({
      basePrompt: "Brand-aware campaign direction.",
      brandProfile,
      brandModeSettings,
    }).injectedBrandDirection,
    promotion: buildPromotionModifier({
      basePrompt: "Brand-aware promotion direction.",
      brandProfile,
      brandModeSettings,
    }).injectedBrandDirection,
  };
}

export function applyBrandModeToPrompt(input: {
  basePrompt: string;
  userId?: string | null;
  kind: "image" | "video" | "campaign" | "promotion";
  brandProfile?: BrandProfile;
  brandModeSettings?: BrandModeSettings;
}): BrandPromptModifierResult {
  const brandProfile = input.brandProfile ?? getBrandProfile(input.userId);
  const brandModeSettings = input.brandModeSettings ?? getBrandModeSettings(input.userId);

  if (!brandModeSettings.enabled) {
    return {
      originalPrompt: input.basePrompt.trim(),
      enhancedPrompt: input.basePrompt.trim(),
      injectedBrandDirection: [],
      removedBannedWords: [],
      toneAdjustments: [],
      brandProfileId: brandProfile.id,
      brandModeApplied: false,
    };
  }

  if (input.kind === "image") {
    return buildImagePromptModifier({
      basePrompt: input.basePrompt,
      brandProfile,
      brandModeSettings,
    });
  }

  if (input.kind === "video") {
    return buildVideoPromptModifier({
      basePrompt: input.basePrompt,
      brandProfile,
      brandModeSettings,
    });
  }

  if (input.kind === "campaign") {
    return buildCampaignModifier({
      basePrompt: input.basePrompt,
      brandProfile,
      brandModeSettings,
    });
  }

  return buildPromotionModifier({
    basePrompt: input.basePrompt,
    brandProfile,
    brandModeSettings,
  });
}

export function applyBrandVoiceToCopy(input: {
  baseCopy: string;
  userId?: string | null;
  brandProfile?: BrandProfile;
  brandModeSettings?: BrandModeSettings;
}): BrandVoiceApplicationResult {
  const brandProfile = input.brandProfile ?? getBrandProfile(input.userId);
  const brandModeSettings = input.brandModeSettings ?? getBrandModeSettings(input.userId);
  const originalCopy = input.baseCopy.trim();
  const sanitized = sanitizeCopy(originalCopy, brandProfile.bannedWords);
  let enhancedCopy = sanitized.content;

  if (brandModeSettings.enabled && brandModeSettings.enforceBrandVoice) {
    enhancedCopy = enhancedCopy
      .replace(/\s+/g, " ")
      .replace(/\s+\./g, ".")
      .trim();
  }

  return {
    originalCopy,
    enhancedCopy,
    removedBannedWords: sanitized.removedBannedWords,
    toneAdjustments: brandModeSettings.enabled
      ? [
          `Voice note: ${brandProfile.brandVoiceNotes}`,
          `CTA style: ${brandProfile.callToActionStyle}`,
        ]
      : [],
    brandProfileId: brandProfile.id,
    brandModeApplied: brandModeSettings.enabled,
  };
}

export function validateBrandOutput(input: {
  content: string;
  userId?: string | null;
  brandProfile?: BrandProfile;
}): BrandValidationResult {
  const brandProfile = input.brandProfile ?? getBrandProfile(input.userId);
  return scoreBrandConsistency({
    content: input.content,
    brandProfile,
  });
}
