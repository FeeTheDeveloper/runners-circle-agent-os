import { createChannelAdapter } from "@/lib/distribution/shared";

export const linkedinAdapter = createChannelAdapter({
  channel: "linkedin",
  endpoint: "/providers/linkedin/publish",
  manualSteps: [
    "Review the LinkedIn-ready caption and the supporting asset.",
    "Open the LinkedIn post composer for the team or profile destination.",
    "Paste the packaged copy, upload the asset, and confirm the publishing window.",
  ],
});
