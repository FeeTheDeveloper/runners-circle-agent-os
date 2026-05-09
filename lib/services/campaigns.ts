import { mockCampaignAssets, mockCampaigns } from "@/lib/data/campaigns";
import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import { applyBrandModeToPrompt, applyBrandVoiceToCopy, getBrandModeSettings, getBrandProfile, validateBrandOutput } from "@/lib/services/brand";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import { getMediaAssetById } from "@/lib/services/media-storage";
import { checkUsageLimit, consumeUsageCredit, recordUsageEvent } from "@/lib/services/usage";
import type {
  Campaign,
  CampaignAsset,
  CampaignAssetStatus,
  CampaignChannel,
  CampaignInput,
  CampaignResponse,
  CampaignStatus,
} from "@/lib/types/campaigns";

const campaignsStore = mockCampaigns.map((campaign) => ({
  ...campaign,
  channels: [...campaign.channels],
  assignedMediaIds: [...campaign.assignedMediaIds],
}));

const campaignAssetsStore = mockCampaignAssets.map((asset) => ({ ...asset }));

function createCampaignId() {
  return `campaign_${crypto.randomUUID().slice(0, 6)}`;
}

function createCampaignAssetId() {
  return `campaign_asset_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createCampaignAssetRecord(
  campaignId: string,
  mediaAssetId: string,
  channel: CampaignChannel,
  role: string,
  status: CampaignAssetStatus,
): CampaignAsset {
  return {
    id: createCampaignAssetId(),
    campaignId,
    mediaAssetId,
    role,
    channel,
    status,
    createdAt: nowIso(),
  };
}

function getDefaultAssetRole(mediaAssetId: string) {
  const mediaAsset = getMediaAssetById(mediaAssetId);

  if (!mediaAsset) {
    return "campaign_asset";
  }

  return mediaAsset.type === "video" ? "motion_support" : "hero_support";
}

function prioritizeChannels(channels: CampaignChannel[], preferredPlatforms: string[]) {
  const preferred = preferredPlatforms.filter((platform): platform is CampaignChannel => channels.includes(platform as CampaignChannel));
  const remainder = channels.filter((channel) => !preferred.includes(channel));

  return [...preferred, ...remainder];
}

function resolveBrandContext(input: CampaignInput) {
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

function validateCampaignInput(input: CampaignInput) {
  if (
    !input.name.trim() ||
    !input.targetAudience.trim() ||
    !input.coreMessage.trim() ||
    !input.assignedAgentId.trim()
  ) {
    return {
      success: false as const,
      error: {
        message: "Name, target audience, core message, and assigned agent are required.",
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

  const agentValidation = validateAgentTask(input.assignedAgentId, "build_campaign");

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

  return {
    success: true as const,
  };
}

export function getCampaigns(): Campaign[] {
  return [...campaignsStore].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function getCampaignById(id: string): Campaign | null {
  return campaignsStore.find((campaign) => campaign.id === id) ?? null;
}

export function createCampaign(input: CampaignInput): CampaignResponse<{ campaign: Campaign; assets: CampaignAsset[] }> {
  const validation = validateCampaignInput(input);

  if (!validation.success) {
    return validation;
  }

  const teamId =
    input.teamId ??
    input.mediaAssetIds
      .map((mediaAssetId) => getMediaAssetById(mediaAssetId)?.teamId)
      .find((value): value is string => typeof value === "string" && value.trim().length > 0) ??
    DEFAULT_MOCK_TEAM_ID;
  const usageSummary = checkUsageLimit({
    userId: input.userId ?? "mock-user",
    teamId,
    type: "campaign_created",
  });
  const { brandProfile, brandModeSettings, brandModeEnabled } = resolveBrandContext(input);
  const timestamp = nowIso();
  const brandPrompt = applyBrandModeToPrompt({
    basePrompt: `${input.name}. ${input.coreMessage}. Audience: ${input.targetAudience}. Channels: ${input.channels.join(", ")}.`,
    userId: input.userId,
    kind: "campaign",
    brandProfile,
    brandModeSettings,
  });
  const coreMessage = applyBrandVoiceToCopy({
    baseCopy: input.coreMessage.trim(),
    userId: input.userId,
    brandProfile,
    brandModeSettings,
  });
  const campaignName = applyBrandVoiceToCopy({
    baseCopy: input.name.trim(),
    userId: input.userId,
    brandProfile,
    brandModeSettings: {
      ...brandModeSettings,
      enforceBrandVoice: false,
    },
  });
  const orderedChannels = brandModeEnabled
    ? prioritizeChannels([...input.channels], brandProfile.preferredPlatforms)
    : [...input.channels];
  const brandValidation = validateBrandOutput({
    content: `${campaignName.enhancedCopy} ${brandPrompt.enhancedPrompt} ${coreMessage.enhancedCopy}`,
    brandProfile,
  });
  const nextAction = brandModeEnabled
    ? `Review the ${brandProfile.name} campaign build on ${orderedChannels[0]} and keep CTA language ${brandProfile.callToActionStyle.toLowerCase()}.`
    : "Campaign queued for Campaign Builder Agent execution.";
  const campaign: Campaign = {
    id: createCampaignId(),
    teamId,
    name: campaignName.enhancedCopy,
    objective: input.objective,
    status: "building",
    reviewStatus: null,
    assignedReviewerId: null,
    channels: orderedChannels,
    assignedMediaIds: [...input.mediaAssetIds],
    assignedAgentId: input.assignedAgentId,
    targetAudience: input.targetAudience.trim(),
    coreMessage: coreMessage.enhancedCopy,
    nextAction:
      brandValidation.warnings.length > 0
        ? `${nextAction} Brand note: ${brandValidation.warnings[0]}`
        : nextAction,
    brandProfileId: brandProfile.id,
    brandProfileName: brandProfile.name,
    brandTone: brandProfile.tone,
    brandModeApplied: brandModeEnabled,
    createdAt: timestamp,
    updatedAt: timestamp,
    usageSummary,
  };

  const campaignAssets = input.mediaAssetIds.map((mediaAssetId) =>
    createCampaignAssetRecord(campaign.id, mediaAssetId, orderedChannels[0], getDefaultAssetRole(mediaAssetId), "assigned"),
  );

  campaignsStore.unshift(campaign);
  campaignAssetsStore.unshift(...campaignAssets);

  for (const mediaAssetId of input.mediaAssetIds) {
    const mediaAsset = getMediaAssetById(mediaAssetId);

    if (mediaAsset) {
      mediaAsset.campaignId = campaign.id;
      mediaAsset.updatedAt = timestamp;
      mediaAsset.metadata = {
        ...mediaAsset.metadata,
        campaignId: campaign.id,
        brandProfileId: brandProfile.id,
        brandProfileName: brandProfile.name,
        brandTone: brandProfile.tone,
        brandModeApplied: brandModeEnabled,
      };
    }
  }

  consumeUsageCredit({
    userId: input.userId ?? "mock-user",
    teamId,
    type: "campaign_created",
  });
  recordUsageEvent({
    userId: input.userId ?? "mock-user",
    teamId,
    type: "campaign_created",
    relatedEntityType: "campaign",
    relatedEntityId: campaign.id,
    metadata: {
      objective: campaign.objective,
      channels: campaign.channels,
      warning: usageSummary.warning,
    },
  });

  // TODO: Persist campaigns and campaign assets to Supabase Postgres when the database layer is enabled.
  // TODO: Trigger Campaign Builder Agent execution after the live agent bridge is connected.

  return {
    success: true,
    data: {
      campaign,
      assets: campaignAssets,
    },
  };
}

export function updateCampaignStatus(id: string, status: CampaignStatus): Campaign | null {
  const campaign = getCampaignById(id);

  if (!campaign) {
    return null;
  }

  campaign.status = status;
  campaign.updatedAt = nowIso();

  // TODO: Sync campaign status changes to Supabase once persistence is enabled.

  return campaign;
}

export function addMediaToCampaign(
  campaignId: string,
  mediaAssetId: string,
): CampaignResponse<{ campaign: Campaign; campaignAsset: CampaignAsset }> {
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    return {
      success: false,
      error: {
        message: "Campaign not found.",
        code: "CAMPAIGN_NOT_FOUND",
      },
    };
  }

  const mediaAsset = getMediaAssetById(mediaAssetId);

  if (!mediaAsset) {
    return {
      success: false,
      error: {
        message: "Media asset not found.",
        code: "MEDIA_NOT_FOUND",
      },
    };
  }

  if (campaign.assignedMediaIds.includes(mediaAssetId)) {
    return {
      success: false,
      error: {
        message: "Media asset is already assigned to this campaign.",
        code: "MEDIA_ALREADY_ASSIGNED",
      },
    };
  }

  const timestamp = nowIso();
  campaign.assignedMediaIds = [...campaign.assignedMediaIds, mediaAssetId];
  campaign.updatedAt = timestamp;
  campaign.nextAction = campaign.brandModeApplied
    ? `Review the newly linked asset "${mediaAsset.title}" and keep it aligned with ${campaign.brandProfileName ?? "the active brand"} tone.`
    : `Review the newly linked asset "${mediaAsset.title}" in the campaign build.`;

  mediaAsset.campaignId = campaign.id;
  mediaAsset.updatedAt = timestamp;
  mediaAsset.metadata = {
    ...mediaAsset.metadata,
    campaignId: campaign.id,
    brandProfileId: campaign.brandProfileId ?? mediaAsset.metadata.brandProfileId ?? null,
    brandProfileName: campaign.brandProfileName ?? mediaAsset.metadata.brandProfileName ?? null,
    brandTone: campaign.brandTone ?? mediaAsset.metadata.brandTone ?? null,
    brandModeApplied: campaign.brandModeApplied ?? mediaAsset.metadata.brandModeApplied ?? false,
  };

  const campaignAsset = createCampaignAssetRecord(
    campaign.id,
    mediaAssetId,
    campaign.channels[0],
    getDefaultAssetRole(mediaAssetId),
    "assigned",
  );

  campaignAssetsStore.unshift(campaignAsset);

  // TODO: Persist campaign-media links to Supabase Postgres when the database layer is enabled.
  // TODO: Notify the Campaign Builder Agent about the new asset once live execution is connected.

  return {
    success: true,
    data: {
      campaign,
      campaignAsset,
    },
  };
}

export function removeMediaFromCampaign(
  campaignId: string,
  mediaAssetId: string,
): CampaignResponse<{ campaign: Campaign; removedMediaId: string }> {
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    return {
      success: false,
      error: {
        message: "Campaign not found.",
        code: "CAMPAIGN_NOT_FOUND",
      },
    };
  }

  if (!campaign.assignedMediaIds.includes(mediaAssetId)) {
    return {
      success: false,
      error: {
        message: "Media asset not found in this campaign.",
        code: "MEDIA_NOT_FOUND",
      },
    };
  }

  campaign.assignedMediaIds = campaign.assignedMediaIds.filter((id) => id !== mediaAssetId);
  campaign.updatedAt = nowIso();

  const assetIndex = campaignAssetsStore.findIndex(
    (asset) => asset.campaignId === campaignId && asset.mediaAssetId === mediaAssetId,
  );

  if (assetIndex >= 0) {
    campaignAssetsStore.splice(assetIndex, 1);
  }

  const mediaAsset = getMediaAssetById(mediaAssetId);

  if (mediaAsset?.campaignId === campaignId) {
    mediaAsset.campaignId = null;
    mediaAsset.updatedAt = campaign.updatedAt;
  }

  // TODO: Persist campaign unlink actions to Supabase once the backend is ready.

  return {
    success: true,
    data: {
      campaign,
      removedMediaId: mediaAssetId,
    },
  };
}

export function getCampaignAssets(campaignId: string): CampaignAsset[] {
  return campaignAssetsStore.filter((asset) => asset.campaignId === campaignId);
}
