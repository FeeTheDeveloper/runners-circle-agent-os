import { createChannelAdapter } from "@/lib/distribution/shared";

export const youtubeShortsAdapter = createChannelAdapter({
  channel: "youtube_shorts",
  endpoint: "/providers/youtube-shorts/publish",
  manualSteps: [
    "Confirm the title, description, and short-form asset pairing.",
    "Upload the prepared asset into YouTube Shorts.",
    "Paste the packaged metadata and verify visibility settings before publishing.",
  ],
});
