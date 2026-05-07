import { mockCampaignAssets, mockCampaigns } from "@/lib/data/campaigns";
import { validateAgentTask } from "@/lib/services/agent-tasks";
import { getMediaAssetById } from "@/lib/services/media-storage";
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

  const timestamp = nowIso();
  const campaign: Campaign = {
    id: createCampaignId(),
    name: input.name.trim(),
    objective: input.objective,
    status: "building",
    channels: [...input.channels],
    assignedMediaIds: [...input.mediaAssetIds],
    assignedAgentId: input.assignedAgentId,
    targetAudience: input.targetAudience.trim(),
    coreMessage: input.coreMessage.trim(),
    nextAction: "Campaign queued for Campaign Builder Agent execution.",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const campaignAssets = input.mediaAssetIds.map((mediaAssetId) =>
    createCampaignAssetRecord(campaign.id, mediaAssetId, input.channels[0], getDefaultAssetRole(mediaAssetId), "assigned"),
  );

  campaignsStore.unshift(campaign);
  campaignAssetsStore.unshift(...campaignAssets);

  for (const mediaAssetId of input.mediaAssetIds) {
    const mediaAsset = getMediaAssetById(mediaAssetId);

    if (mediaAsset) {
      mediaAsset.campaignId = campaign.id;
      mediaAsset.updatedAt = timestamp;
    }
  }

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
  campaign.nextAction = `Review the newly linked asset "${mediaAsset.title}" in the campaign build.`;

  mediaAsset.campaignId = campaign.id;
  mediaAsset.updatedAt = timestamp;

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
