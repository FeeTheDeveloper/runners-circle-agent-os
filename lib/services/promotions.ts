import { mockPromotionPackages } from "@/lib/data/promotions";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import { getCampaignById } from "@/lib/services/campaigns";
import { getMediaAssetById } from "@/lib/services/media-storage";
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

export function createCaptionSet(input: PromotionInput): CaptionSet {
  const campaign = getCampaignById(input.campaignId);
  const campaignName = campaign?.name ?? "Promotion package";
  const coreMessage = campaign?.coreMessage ?? "Move the campaign forward.";
  const channelSummary = input.channels.map((channel) => channel.replaceAll("_", " ")).join(", ");

  return {
    instagramCaption: `${campaignName} is built for premium motion and direct response. ${coreMessage} ${input.callToAction}.`,
    tiktokCaption: `${campaignName} moves with fast hooks, premium energy, and a direct ask: ${input.callToAction}.`,
    youtubeShortsTitle: `${campaignName} | ${input.callToAction}`,
    youtubeShortsDescription: `${campaignName} is packaged for ${channelSummary}. Tone: ${input.tone}. ${coreMessage} ${input.callToAction}.`,
    xPost: `${campaignName} is prepared for ${channelSummary}. ${coreMessage} ${input.callToAction}.`,
    emailSubject: `${campaignName}: ${input.callToAction}`,
    emailBody: `${campaignName} is now packaged for ${channelSummary}. Tone: ${input.tone}. Core message: ${coreMessage} ${input.callToAction}.`,
    websiteBlurb: `${campaignName} turns approved campaign media into a channel-ready promotion package with a ${input.tone} voice.`,
    hashtags: ["#RunnersCircle", "#AgentOS", "#DirectPromotion", "#PremiumAthletic"],
  };
}

export function preparePromotionPackage(
  input: PromotionInput,
): PromotionResponse<{ promotionPackage: PromotionPackage }> {
  const validation = validatePromotionInput(input);

  if (!validation.success) {
    return validation;
  }

  const timestamp = nowIso();
  const promotionPackage: PromotionPackage = {
    id: createPromotionId(),
    campaignId: input.campaignId,
    mediaAssetIds: [...input.mediaAssetIds],
    channels: [...input.channels],
    status: "prepared",
    captionSet: createCaptionSet(input),
    checklist: createChecklist(input.channels.length),
    assignedAgentId: input.assignedAgentId,
    tone: input.tone.trim(),
    callToAction: input.callToAction.trim(),
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
