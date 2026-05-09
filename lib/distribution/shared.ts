import type {
  DistributionChannel,
  DistributionChannelAdapter,
  DistributionMockPublishResponse,
  DistributionPayload,
  PublishingProvider,
} from "@/lib/types/distribution";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createMockPublishedUrl(channel: DistributionChannel, payload: DistributionPayload) {
  return `https://mock.runnerscircle.local/${channel}/${payload.jobId}`;
}

function createMockExternalId(channel: DistributionChannel, payload: DistributionPayload) {
  return `${channel}_${slugify(payload.jobId)}_${crypto.randomUUID().slice(0, 6)}`;
}

function createMockResponse(channel: DistributionChannel, payload: DistributionPayload): DistributionMockPublishResponse {
  const publishedAt = new Date().toISOString();

  return {
    ok: true,
    externalId: createMockExternalId(channel, payload),
    publishedUrl: createMockPublishedUrl(channel, payload),
    publishedAt,
    notes: `Mock ${channel.replaceAll("_", " ")} publish completed for ${payload.jobId}.`,
  };
}

export function createChannelAdapter(config: {
  channel: DistributionChannel;
  endpoint: string;
  mediaRequired?: boolean;
  manualSteps: string[];
  payloadBuilder?: (payload: DistributionPayload) => Record<string, unknown>;
}): DistributionChannelAdapter {
  const mediaRequired = config.mediaRequired ?? true;

  return {
    channel: config.channel,
    validatePayload(payload) {
      const issues: string[] = [];

      if (!payload.caption.trim()) {
        issues.push("Caption is required before a distribution job can publish.");
      }

      if (mediaRequired && payload.mediaAssetIds.length === 0) {
        issues.push("At least one media asset is required for this channel.");
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    },
    buildPublishRequest(payload, provider) {
      return {
        provider,
        endpoint: provider === "manual" || provider === "future_live" ? null : config.endpoint,
        method: "POST",
        payload:
          config.payloadBuilder?.(payload) ?? {
            channel: payload.channel,
            caption: payload.caption,
            mediaAssetIds: payload.mediaAssetIds,
            scheduledFor: payload.scheduledFor,
          },
        manualSteps: [...config.manualSteps],
      };
    },
    mockPublishResponse(payload) {
      return createMockResponse(config.channel, payload);
    },
    normalizePublishResult(input) {
      if (input.provider === "mock" && input.response) {
        return {
          success: input.response.ok,
          status: input.response.ok ? "published" : "failed",
          publishedAt: input.response.ok ? input.response.publishedAt : null,
          publishedUrl: input.response.ok ? input.response.publishedUrl : null,
          errorMessage: input.response.ok ? null : "Mock publishing failed.",
          metadata: {
            providerMode: "mock",
            request: input.request,
            response: input.response,
          },
        };
      }

      return {
        success: true,
        status: "publishing",
        publishedAt: null,
        publishedUrl: null,
        errorMessage: null,
        metadata: {
          providerMode: input.provider,
          request: input.request,
          livePublishingExecuted: false,
          livePublishingAvailable: false,
          preparedAt: input.now,
        },
      };
    },
  };
}
