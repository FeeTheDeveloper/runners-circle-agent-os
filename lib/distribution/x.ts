import { createChannelAdapter } from "@/lib/distribution/shared";

export const xAdapter = createChannelAdapter({
  channel: "x",
  endpoint: "/providers/x/publish",
  manualSteps: [
    "Review the short-form post copy for platform fit.",
    "Attach the selected asset set in the X composer.",
    "Paste the packaged post and confirm timing before publishing.",
  ],
});
