import { getPromotionPackageById } from "@/lib/services/promotions";

export function exportCaptionPack(packageId: string): string | null {
  const promotionPackage = getPromotionPackageById(packageId);

  if (!promotionPackage) {
    return null;
  }

  const { captionSet } = promotionPackage;

  // TODO: Add PDF, CSV, and Notion export targets once promotion export destinations are introduced.
  return [
    `Promotion Package: ${promotionPackage.id}`,
    `Campaign: ${promotionPackage.campaignId}`,
    `Status: ${promotionPackage.status}`,
    `Channels: ${promotionPackage.channels.join(", ")}`,
    `CTA: ${promotionPackage.callToAction}`,
    "",
    "Instagram Caption:",
    captionSet.instagramCaption,
    "",
    "TikTok Caption:",
    captionSet.tiktokCaption,
    "",
    "YouTube Shorts Title:",
    captionSet.youtubeShortsTitle,
    "",
    "YouTube Shorts Description:",
    captionSet.youtubeShortsDescription,
    "",
    "X Post:",
    captionSet.xPost,
    "",
    "Email Subject:",
    captionSet.emailSubject,
    "",
    "Email Body:",
    captionSet.emailBody,
    "",
    "Website Blurb:",
    captionSet.websiteBlurb,
    "",
    "Hashtags:",
    captionSet.hashtags.join(" "),
  ].join("\n");
}
