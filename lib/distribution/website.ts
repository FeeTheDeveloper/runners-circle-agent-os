import { createChannelAdapter } from "@/lib/distribution/shared";

export const websiteAdapter = createChannelAdapter({
  channel: "website",
  endpoint: "/providers/website/publish",
  manualSteps: [
    "Open the website CMS entry or landing-page draft.",
    "Insert the packaged blurb, linked media, and placement metadata.",
    "Preview the page and confirm the release timing before publishing.",
  ],
});
