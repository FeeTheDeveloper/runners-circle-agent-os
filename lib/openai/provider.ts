import { isInternalOperatorModeEnabled } from "@/lib/config/internal-mode";

export type OpenAiProviderState = "connected" | "missing_key" | "fallback_mode" | "mock_mode";

export interface OpenAiProviderStatus {
  state: OpenAiProviderState;
  label: string;
  detail: string;
  apiKeyConfigured: boolean;
  liveExecutionEnabled: boolean;
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getOpenAiProviderStatus(): OpenAiProviderStatus {
  const apiKeyConfigured = Boolean(normalizeEnvValue(process.env.OPENAI_API_KEY));
  const liveExecutionEnabled = false;
  const internalOperatorMode = isInternalOperatorModeEnabled();

  if (apiKeyConfigured && liveExecutionEnabled) {
    return {
      state: "connected",
      label: "connected",
      detail: "Live OpenAI execution is wired and ready for direct provider calls.",
      apiKeyConfigured,
      liveExecutionEnabled,
    };
  }

  if (apiKeyConfigured) {
    return {
      state: "fallback_mode",
      label: "fallback mode",
      detail: "The OpenAI key is present, but generation still falls back to mock contracts until the live provider layer is wired.",
      apiKeyConfigured,
      liveExecutionEnabled,
    };
  }

  if (internalOperatorMode) {
    return {
      state: "mock_mode",
      label: "mock mode",
      detail: "Internal operator mode keeps generation available with mock contracts even without an OpenAI key.",
      apiKeyConfigured,
      liveExecutionEnabled,
    };
  }

  return {
    state: "missing_key",
    label: "missing key",
    detail: "Add OPENAI_API_KEY to move beyond mock generation and provider fallback behavior.",
    apiKeyConfigured,
    liveExecutionEnabled,
  };
}
