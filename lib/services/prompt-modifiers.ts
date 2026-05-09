import type { BrandModeSettings, BrandProfile, BrandPromptModifierResult } from "@/lib/types/brand";

interface PromptModifierInput {
  basePrompt: string;
  brandProfile: BrandProfile;
  brandModeSettings: BrandModeSettings;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function removeBannedWords(content: string, bannedWords: string[]) {
  let sanitized = content;
  const removed: string[] = [];

  for (const bannedWord of bannedWords) {
    const pattern = new RegExp(`\\b${bannedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");

    if (pattern.test(sanitized)) {
      removed.push(bannedWord);
      sanitized = sanitized.replace(pattern, "");
    }
  }

  return {
    sanitized: normalizeWhitespace(sanitized),
    removedBannedWords: unique(removed),
  };
}

function buildModifierResult(
  input: PromptModifierInput,
  injectedBrandDirection: string[],
  toneAdjustments: string[],
): BrandPromptModifierResult {
  const originalPrompt = normalizeWhitespace(input.basePrompt);
  const filtered = removeBannedWords(originalPrompt, input.brandProfile.bannedWords);
  const enhancedPrompt = input.brandModeSettings.enabled
    ? normalizeWhitespace(
        [
          filtered.sanitized,
          "",
          "Brand direction:",
          ...injectedBrandDirection.map((line) => `- ${line}`),
        ].join("\n"),
      )
    : filtered.sanitized;

  return {
    originalPrompt,
    enhancedPrompt,
    injectedBrandDirection,
    removedBannedWords: filtered.removedBannedWords,
    toneAdjustments,
    brandProfileId: input.brandProfile.id,
    brandModeApplied: input.brandModeSettings.enabled,
  };
}

export function buildImagePromptModifier(input: PromptModifierInput) {
  const injectedBrandDirection = [
    `Visual system: ${input.brandProfile.visualStyle}`,
    `Tone: ${input.brandProfile.tone}. ${input.brandProfile.brandVoiceNotes}`,
    input.brandModeSettings.enforceColorDirection
      ? `Color direction: primary ${input.brandProfile.primaryColor}, secondary ${input.brandProfile.secondaryColor}, accent ${input.brandProfile.accentColor}.`
      : "Color direction follows the original request without enforced palette overrides.",
    `Typography feel: ${input.brandProfile.typographyStyle}`,
    `Audience: ${input.brandProfile.audience}`,
  ];
  const toneAdjustments = [
    `Keep the framing ${input.brandProfile.tone}, disciplined, and premium.`,
    "Avoid weak motivational language or vague lifestyle filler.",
  ];

  return buildModifierResult(input, injectedBrandDirection, toneAdjustments);
}

export function buildVideoPromptModifier(input: PromptModifierInput) {
  const injectedBrandDirection = [
    `Visual system: ${input.brandProfile.visualStyle}`,
    input.brandModeSettings.enforceMotionStyle
      ? `Motion direction: ${input.brandProfile.motionStyle}`
      : "Motion style follows the original request without enforced overrides.",
    `Tone: ${input.brandProfile.tone}. ${input.brandProfile.brandVoiceNotes}`,
    `CTA attitude: ${input.brandProfile.callToActionStyle}`,
    `Preferred launch platforms: ${input.brandProfile.preferredPlatforms.join(", ")}`,
  ];
  const toneAdjustments = [
    "Keep pacing cinematic and controlled rather than generic hype-driven motion.",
    "Preserve strong urban athletic energy with clean end-card clarity.",
  ];

  return buildModifierResult(input, injectedBrandDirection, toneAdjustments);
}

export function buildCampaignModifier(input: PromptModifierInput) {
  const injectedBrandDirection = [
    `Campaign voice: ${input.brandProfile.brandVoiceNotes}`,
    `Primary audience: ${input.brandProfile.audience}`,
    `Preferred platforms: ${input.brandProfile.preferredPlatforms.join(", ")}`,
    `CTA style: ${input.brandProfile.callToActionStyle}`,
    `Core visual direction: ${input.brandProfile.visualStyle}`,
  ];
  const toneAdjustments = [
    "Preserve campaign consistency across image, video, copy, and CTA language.",
    `Favor ${input.brandProfile.tone} and disciplined wording over soft motivational messaging.`,
  ];

  return buildModifierResult(input, injectedBrandDirection, toneAdjustments);
}

export function buildPromotionModifier(input: PromptModifierInput) {
  const injectedBrandDirection = [
    `Promotion tone: ${input.brandProfile.tone}`,
    `Brand voice rules: ${input.brandProfile.brandVoiceNotes}`,
    `CTA style: ${input.brandProfile.callToActionStyle}`,
    `Platform strategy: lead with ${input.brandProfile.preferredPlatforms.join(", ")}`,
    `Tagline anchor: ${input.brandProfile.tagline}`,
  ];
  const toneAdjustments = [
    "Keep captions short, direct, and command-driven.",
    "Avoid filler language, soft hype, or generic motivational clichés.",
  ];

  return buildModifierResult(input, injectedBrandDirection, toneAdjustments);
}
