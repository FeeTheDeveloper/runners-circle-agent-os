import type { PromotionChannel } from "@/lib/types/promotions";

export const brandTones = [
  "premium",
  "athletic",
  "cinematic",
  "luxury",
  "aggressive",
  "disciplined",
  "minimal",
  "energetic",
] as const;
export type BrandTone = (typeof brandTones)[number];

export const brandModeStrictnessLevels = ["light", "balanced", "strict"] as const;
export type BrandModeStrictness = (typeof brandModeStrictnessLevels)[number];

export interface BrandProfile {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typographyStyle: string;
  visualStyle: string;
  motionStyle: string;
  tone: BrandTone;
  tagline: string;
  audience: string;
  keywords: string[];
  bannedWords: string[];
  preferredPlatforms: PromotionChannel[];
  logoUrl: string;
  brandVoiceNotes: string;
  callToActionStyle: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandModeSettings {
  enabled: boolean;
  strictness: BrandModeStrictness;
  injectPromptModifiers: boolean;
  enforceBrandVoice: boolean;
  enforceColorDirection: boolean;
  enforceMotionStyle: boolean;
}

export interface BrandPromptModifierResult {
  originalPrompt: string;
  enhancedPrompt: string;
  injectedBrandDirection: string[];
  removedBannedWords: string[];
  toneAdjustments: string[];
  brandProfileId: string | null;
  brandModeApplied: boolean;
}

export interface BrandVoiceApplicationResult {
  originalCopy: string;
  enhancedCopy: string;
  removedBannedWords: string[];
  toneAdjustments: string[];
  brandProfileId: string | null;
  brandModeApplied: boolean;
}

export interface BrandValidationResult {
  pass: boolean;
  warnings: string[];
  recommendations: string[];
  consistencyScore: number;
}

export interface UpdateBrandProfileInput {
  userId: string;
  profile: Partial<Omit<BrandProfile, "id" | "userId" | "createdAt" | "updatedAt">>;
  modeSettings?: Partial<BrandModeSettings>;
}
