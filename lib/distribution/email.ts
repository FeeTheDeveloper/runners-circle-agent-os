import { createChannelAdapter } from "@/lib/distribution/shared";

export const emailAdapter = createChannelAdapter({
  channel: "email",
  endpoint: "/providers/email/publish",
  manualSteps: [
    "Open the email platform or campaign draft.",
    "Apply the packaged subject line, body copy, and asset references.",
    "Validate segmentation and delivery timing before sending or scheduling.",
  ],
});
