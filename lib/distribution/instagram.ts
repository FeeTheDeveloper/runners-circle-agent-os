import { createChannelAdapter } from "@/lib/distribution/shared";

export const instagramAdapter = createChannelAdapter({
  channel: "instagram",
  endpoint: "/providers/instagram/publish",
  manualSteps: [
    "Review the final caption and media ordering.",
    "Open the Instagram publishing tool with the prepared asset set.",
    "Paste the packaged caption and confirm the post timing.",
  ],
});
