import { mockPromotionPackages } from "@/lib/data/promotions";
import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import { applyBrandVoiceToCopy, getBrandModeSettings, getBrandProfile, validateBrandOutput } from "@/lib/services/brand";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import { getCampaignById } from "@/lib/services/campaigns";
import { getMediaAssetById } from "@/lib/services/media-storage";
import type { DistributionChannel } from "@/lib/types/distribution";
import type {
  CaptionSet,
  PromotionChecklistItem,
  PromotionInput,
  PromotionPackage,
  PromotionResponse,
  PromotionStatus,
} from "@/lib/types/promotions";

const promotionPackagesStore = mockPromotionPackages.map((promotionPackage) => ({
  ...promotionPackage,
  mediaAssetIds: [...promotionPackage.mediaAssetIds],
  channels: [...promotionPackage.channels],
  captionSet: {
    ...promotionPackage.captionSet,
    hashtags: [...promotionPackage.captionSet.hashtags],
  },
  checklist: promotionPackage.checklist.map((item) => ({ ...item })),
}));

function createPromotionId() {
  return `promotion_${crypto.randomUUID().slice(0, 6)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createChecklist(channelCount: number): PromotionChecklistItem[] {
  return [
    { id: `check_${crypto.randomUUID().slice(0, 6)}`, label: "Caption set drafted", completed: true },
    { id: `check_${crypto.randomUUID().slice(0, 6)}`, label: "Channel packaging mapped", completed: channelCount > 1 },
    { id: `check_${crypto.randomUUID().slice(0, 6)}`, label: "Operator review requested", completed: false },
    { id: `check_${crypto.randomUUID().slice(0, 6)}`, label: "Export handoff prepared", completed: false },
  ];
}

function prioritizeChannels(channels: PromotionInput["channels"], preferredPlatforms: string[]) {
  const preferred = preferredPlatforms.filter((platform): platform is PromotionInput["channels"][number] =>
    channels.includes(platform as PromotionInput["channels"][number]),
  );
  const remainder = channels.filter((channel) => !preferred.includes(channel));

  return [...preferred, ...remainder];
}

function resolveBrandContext(input: PromotionInput) {
  const brandProfile = getBrandProfile(input.userId);
  const storedSettings = getBrandModeSettings(input.userId);
  const brandModeEnabled = input.brandModeEnabled ?? storedSettings.enabled;

  return {
    brandProfile,
    brandModeSettings: {
      ...storedSettings,
      enabled: brandModeEnabled,
    },
    brandModeEnabled,
  };
}

function normalizeHashtag(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, " ").trim();

  if (!cleaned) {
    return null;
  }

  return `#${cleaned
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join("")}`;
}

function validatePromotionInput(input: PromotionInput) {
  if (
    !input.campaignId.trim() ||
    !input.tone.trim() ||
    !input.callToAction.trim() ||
    !input.assignedAgentId.trim()
  ) {
    return {
      success: false as const,
      error: {
        message: "Campaign, tone, call to action, and assigned agent are required.",
        code: "VALIDATION_ERROR" as const,
      },
    };
  }

  if (input.channels.length === 0 || input.mediaAssetIds.length === 0) {
    return {
      success: false as const,
      error: {
        message: "At least one channel and one media asset are required.",
        code: "VALIDATION_ERROR" as const,
      },
    };
  }

  const campaign = getCampaignById(input.campaignId);

  if (!campaign) {
    return {
      success: false as const,
      error: {
        message: "Campaign not found.",
        code: "CAMPAIGN_NOT_FOUND" as const,
      },
    };
  }

  const agentValidation = validateAgentTask(input.assignedAgentId, "prepare_promotion");

  if (!agentValidation.valid) {
    return {
      success: false as const,
      error: {
        message: agentValidation.message,
        code: agentValidation.code,
      },
    };
  }

  const missingMediaId = input.mediaAssetIds.find((mediaAssetId) => !getMediaAssetById(mediaAssetId));

  if (missingMediaId) {
    return {
      success: false as const,
      error: {
        message: `Media asset "${missingMediaId}" was not found.`,
        code: "MEDIA_NOT_FOUND" as const,
      },
    };
  }

  const invalidCampaignMediaId = input.mediaAssetIds.find((mediaAssetId) => !campaign.assignedMediaIds.includes(mediaAssetId));

  if (invalidCampaignMediaId) {
    return {
      success: false as const,
      error: {
        message: `Media asset "${invalidCampaignMediaId}" is not assigned to this campaign.`,
        code: "MEDIA_NOT_FOUND" as const,
      },
    };
  }

  return {
    success: true as const,
    campaign,
  };
}

export function getPromotionPackages(): PromotionPackage[] {
  return [...promotionPackagesStore].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function getPromotionPackageById(id: string): PromotionPackage | null {
  return promotionPackagesStore.find((promotionPackage) => promotionPackage.id === id) ?? null;
}

export function getPromotionDistributionCaption(
  promotionPackage: PromotionPackage,
  channel: DistributionChannel,
) {
  switch (channel) {
    case "instagram":
      return promotionPackage.captionSet.instagramCaption;
    case "tiktok":
      return promotionPackage.captionSet.tiktokCaption;
    case "youtube_shorts":
      return promotionPackage.captionSet.youtubeShortsDescription;
    case "x":
      return promotionPackage.captionSet.xPost;
    case "linkedin":
      return promotionPackage.captionSet.xPost || promotionPackage.captionSet.websiteBlurb;
    case "email":
      return promotionPackage.captionSet.emailBody;
    case "website":
      return promotionPackage.captionSet.websiteBlurb;
  }
}

export function getPromotionDistributionPayload(promotionPackageId: string, channel: DistributionChannel) {
  const promotionPackage = getPromotionPackageById(promotionPackageId);

  if (!promotionPackage) {
    return null;
  }

  return {
    promotionPackageId: promotionPackage.id,
    campaignId: promotionPackage.campaignId,
    teamId: promotionPackage.teamId ?? DEFAULT_MOCK_TEAM_ID,
    channel,
    caption: getPromotionDistributionCaption(promotionPackage, channel),
    mediaAssetIds: [...promotionPackage.mediaAssetIds],
    assignedAgentId: promotionPackage.assignedAgentId,
    promotionStatus: promotionPackage.status,
    reviewStatus: promotionPackage.reviewStatus ?? null,
  };
}

export function createCaptionSet(
  input: PromotionInput,
  options?: {
    brandProfile?: ReturnType<typeof getBrandProfile>;
    brandModeEnabled?: boolean;
  },
): CaptionSet {
  const campaign = getCampaignById(input.campaignId);
  const brandProfile = options?.brandProfile ?? getBrandProfile(input.userId);
  const brandModeEnabled = options?.brandModeEnabled ?? getBrandModeSettings(input.userId).enabled;
  const campaignName = campaign?.name ?? "Promotion package";
  const coreMessage = campaign?.coreMessage ?? "Move the campaign forward.";
  const orderedChannels = brandModeEnabled
    ? prioritizeChannels(input.channels, brandProfile.preferredPlatforms)
    : input.channels;
  const channelSummary = orderedChannels.map((channel) => channel.replaceAll("_", " ")).join(", ");
  const toneSummary = brandModeEnabled
    ? `${brandProfile.tone}, disciplined, and launch-ready`
    : input.tone;
  const cta = applyBrandVoiceToCopy({
    baseCopy: input.callToAction,
    userId: input.userId,
    brandProfile,
    brandModeSettings: {
      ...getBrandModeSettings(input.userId),
      enabled: brandModeEnabled,
    },
  }).enhancedCopy;

  const baseCaptionSet: CaptionSet = {
    instagramCaption: `${campaignName} is live with ${brandProfile.tagline.toLowerCase()} ${coreMessage} ${cta}.`,
    tiktokCaption: `${campaignName} moves with ${toneSummary} energy for ${channelSummary}. ${cta}.`,
    youtubeShortsTitle: `${campaignName} | ${cta}`,
    youtubeShortsDescription: `${campaignName} is packaged for ${channelSummary}. Tone: ${toneSummary}. ${coreMessage} ${cta}.`,
    xPost: `${campaignName} is prepared for ${channelSummary}. ${coreMessage} ${cta}.`,
    emailSubject: `${campaignName}: ${cta}`,
    emailBody: `${campaignName} is now packaged for ${channelSummary}. Voice: ${brandProfile.brandVoiceNotes} ${coreMessage} ${cta}.`,
    websiteBlurb: `${campaignName} delivers ${brandProfile.tone} campaign momentum with ${brandProfile.visualStyle.toLowerCase()}.`,
    hashtags: [
      "#RunnersCircle",
      ...brandProfile.keywords.map(normalizeHashtag).filter((value): value is string => value !== null).slice(0, 3),
    ],
  };

  const voiceSettings = {
    ...getBrandModeSettings(input.userId),
    enabled: brandModeEnabled,
  };

  return {
    instagramCaption: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.instagramCaption,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    tiktokCaption: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.tiktokCaption,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    youtubeShortsTitle: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.youtubeShortsTitle,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    youtubeShortsDescription: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.youtubeShortsDescription,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    xPost: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.xPost,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    emailSubject: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.emailSubject,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    emailBody: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.emailBody,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    websiteBlurb: applyBrandVoiceToCopy({
      baseCopy: baseCaptionSet.websiteBlurb,
      userId: input.userId,
      brandProfile,
      brandModeSettings: voiceSettings,
    }).enhancedCopy,
    hashtags: [...new Set(baseCaptionSet.hashtags)],
  };
}

export function preparePromotionPackage(
  input: PromotionInput,
): PromotionResponse<{ promotionPackage: PromotionPackage }> {
  const validation = validatePromotionInput(input);

  if (!validation.success) {
    return validation;
  }

  const { brandProfile, brandModeEnabled, brandModeSettings } = resolveBrandContext(input);
  const orderedChannels = brandModeEnabled
    ? prioritizeChannels(input.channels, brandProfile.preferredPlatforms)
    : [...input.channels];
  const tone = brandModeEnabled ? `${brandProfile.tone}, disciplined, platform-ready` : input.tone.trim();
  const callToAction = applyBrandVoiceToCopy({
    baseCopy: input.callToAction.trim(),
    userId: input.userId,
    brandProfile,
    brandModeSettings,
  }).enhancedCopy;
  const captionSet = createCaptionSet(input, { brandProfile, brandModeEnabled });
  const brandValidation = validateBrandOutput({
    content: [
      captionSet.instagramCaption,
      captionSet.tiktokCaption,
      captionSet.youtubeShortsDescription,
      captionSet.xPost,
      captionSet.emailBody,
      captionSet.websiteBlurb,
    ].join(" "),
    brandProfile,
  });
  const timestamp = nowIso();
  const checklist = createChecklist(orderedChannels.length);

  if (brandValidation.warnings.length > 0) {
    checklist.push({
      id: `check_${crypto.randomUUID().slice(0, 6)}`,
      label: `Brand review: ${brandValidation.warnings[0]}`,
      completed: false,
    });
  }

  const promotionPackage: PromotionPackage = {
    id: createPromotionId(),
    teamId: input.teamId ?? validation.campaign.teamId ?? DEFAULT_MOCK_TEAM_ID,
    campaignId: input.campaignId,
    mediaAssetIds: [...input.mediaAssetIds],
    channels: orderedChannels,
    status: "prepared",
    reviewStatus: null,
    assignedReviewerId: null,
    captionSet,
    checklist,
    assignedAgentId: input.assignedAgentId,
    tone,
    callToAction,
    brandProfileId: brandProfile.id,
    brandProfileName: brandProfile.name,
    brandTone: brandProfile.tone,
    brandModeApplied: brandModeEnabled,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  promotionPackagesStore.unshift(promotionPackage);

  // TODO: Persist promotion packages to Supabase Postgres when the database layer is enabled.
  // TODO: Trigger live Promotion Agent execution once the external execution bridge is connected.
  // TODO: Add social publishing integration hooks after channel publishing is implemented.

  return {
    success: true,
    data: {
      promotionPackage,
    },
  };
}

export function updatePromotionStatus(id: string, status: PromotionStatus): PromotionPackage | null {
  const promotionPackage = getPromotionPackageById(id);

  if (!promotionPackage) {
    return null;
  }

  promotionPackage.status = status;
  promotionPackage.updatedAt = nowIso();

  // TODO: Sync promotion package status changes to persistence and publishing integrations later.

  return promotionPackage;
}

export function getPromotionChecklist(packageId: string): PromotionChecklistItem[] | null {
  const promotionPackage = getPromotionPackageById(packageId);

  return promotionPackage ? promotionPackage.checklist.map((item) => ({ ...item })) : null;
}
