import { createChannelAdapter } from "@/lib/distribution/shared";

export const tiktokAdapter = createChannelAdapter({
  channel: "tiktok",
  endpoint: "/providers/tiktok/publish",
  manualSteps: [
    "Verify the short-form motion asset and hook line.",
    "Upload the selected media into the TikTok post composer.",
    "Apply the packaged caption and confirm the scheduled publish window.",
  ],
});
