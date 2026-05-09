import type { PromotionPackage } from "@/lib/types/promotions";
import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";

export const mockPromotionPackages: PromotionPackage[] = [
  {
    id: "promotion_001",
    teamId: DEFAULT_MOCK_TEAM_ID,
    campaignId: "campaign_001",
    mediaAssetIds: ["media_001", "media_004"],
    channels: ["instagram", "tiktok", "youtube_shorts"],
    status: "ready_for_review",
    reviewStatus: "pending_review",
    assignedReviewerId: "reviewer@runnerscircle.local",
    captionSet: {
      instagramCaption:
        "Night Run is live. Precision gear, city light, and a system built to move with you. Enter the OS.",
      tiktokCaption:
        "Night Run is how the circle moves after dark. Premium pace, sharp visuals, and a launch built for runners. Enter the OS.",
      youtubeShortsTitle: "Night Run Launch | Enter the OS",
      youtubeShortsDescription:
        "The Night Run launch package pairs premium motion with direct campaign energy for runner-led communities. Enter the OS.",
      xPost:
        "Night Run Launch Campaign is ready for review. Premium athletic energy. Direct system message. Enter the OS.",
      emailSubject: "Night Run Launch: Enter the OS",
      emailBody:
        "The Night Run package is ready to move. Launch visuals, short-form motion, and a direct call for urban runners to enter the OS.",
      websiteBlurb:
        "The Night Run launch package blends direct system messaging with premium athletic visuals built for motion-first channels.",
      hashtags: ["#RunnersCircle", "#NightRun", "#EnterTheOS", "#RunTheSystem"],
    },
    checklist: [
      { id: "check_001", label: "Instagram caption drafted", completed: true },
      { id: "check_002", label: "TikTok motion hook written", completed: true },
      { id: "check_003", label: "YouTube Shorts metadata reviewed", completed: false },
      { id: "check_004", label: "Operator review requested", completed: false },
    ],
    assignedAgentId: "promotion-agent",
    tone: "premium athletic, direct, high-energy",
    callToAction: "Enter the OS",
    brandProfileId: "brand_runners_circle_default",
    brandProfileName: "Runners Circle",
    brandTone: "premium",
    brandModeApplied: true,
    createdAt: "2026-05-06T14:22:00.000Z",
    updatedAt: "2026-05-06T14:28:00.000Z",
  },
  {
    id: "promotion_002",
    teamId: DEFAULT_MOCK_TEAM_ID,
    campaignId: "campaign_002",
    mediaAssetIds: ["media_002", "media_005"],
    channels: ["instagram", "email", "website"],
    status: "approved",
    reviewStatus: "approved",
    assignedReviewerId: "reviewer@runnerscircle.local",
    captionSet: {
      instagramCaption:
        "Every mile strengthens the circle. Community Miles is approved for rollout with premium product focus and momentum-first storytelling.",
      tiktokCaption:
        "Community Miles keeps the pace human and direct. Bring the crew in and keep the weekly challenge moving.",
      youtubeShortsTitle: "Community Miles | The Circle Moves Together",
      youtubeShortsDescription:
        "Community Miles turns product detail and social motion into an always-on growth loop for local run crews.",
      xPost:
        "Community Miles Campaign is approved. Weekly rhythm, direct social proof, and creator-led running energy.",
      emailSubject: "Community Miles Is Ready to Move",
      emailBody:
        "Community Miles now has approved promotion copy across email, social, and web touchpoints. Keep the crew moving and the weekly cadence sharp.",
      websiteBlurb:
        "Community Miles is a growth package built around repeat motion, direct language, and consistent community proof.",
      hashtags: ["#CommunityMiles", "#RunnersCircle", "#RunTogether", "#WeeklyMiles"],
    },
    checklist: [
      { id: "check_005", label: "Email subject approved", completed: true },
      { id: "check_006", label: "Website blurb approved", completed: true },
      { id: "check_007", label: "Instagram caption approved", completed: true },
      { id: "check_008", label: "Distribution notes added", completed: true },
    ],
    assignedAgentId: "promotion-agent",
    tone: "community-driven, premium, motivating",
    callToAction: "Join the circle",
    brandProfileId: "brand_runners_circle_default",
    brandProfileName: "Runners Circle",
    brandTone: "premium",
    brandModeApplied: true,
    createdAt: "2026-05-06T12:40:00.000Z",
    updatedAt: "2026-05-06T13:32:00.000Z",
  },
  {
    id: "promotion_003",
    teamId: DEFAULT_MOCK_TEAM_ID,
    campaignId: "campaign_003",
    mediaAssetIds: ["media_003"],
    channels: ["x", "website", "youtube_shorts"],
    status: "prepared",
    reviewStatus: null,
    assignedReviewerId: null,
    captionSet: {
      instagramCaption:
        "AI Studio Promo reframes direct media ops for the operator class. Built through agents, shaped for launch velocity.",
      tiktokCaption:
        "Build media ops with agents. Direct input, fast packaging, and a system that keeps the pipeline visible.",
      youtubeShortsTitle: "AI Studio Promo | Media Ops Through Agents",
      youtubeShortsDescription:
        "A direct walkthrough package introducing Runners Circle Agent OS and the operator workflow behind it.",
      xPost:
        "AI Studio Promo Campaign is prepared. Direct media ops. Agent-owned execution. Operator-grade visibility.",
      emailSubject: "See the AI Studio Promo Package",
      emailBody:
        "This package introduces the command-center model behind Runners Circle Agent OS with concise copy for launch channels.",
      websiteBlurb:
        "AI Studio Promo is a feature-story package focused on agent-led media operations and operator clarity.",
      hashtags: ["#AgentOS", "#MediaOps", "#RunnersCircle", "#AICreative"],
    },
    checklist: [
      { id: "check_009", label: "X post drafted", completed: true },
      { id: "check_010", label: "Website blurb drafted", completed: true },
      { id: "check_011", label: "Short-form metadata drafted", completed: true },
      { id: "check_012", label: "Review request sent", completed: false },
    ],
    assignedAgentId: "promotion-agent",
    tone: "operator-grade, direct, premium tech",
    callToAction: "See the system",
    brandProfileId: "brand_runners_circle_default",
    brandProfileName: "Runners Circle",
    brandTone: "premium",
    brandModeApplied: true,
    createdAt: "2026-05-06T11:58:00.000Z",
    updatedAt: "2026-05-06T12:18:00.000Z",
  },
  {
    id: "promotion_004",
    teamId: DEFAULT_MOCK_TEAM_ID,
    campaignId: "campaign_004",
    mediaAssetIds: ["media_006"],
    channels: ["instagram", "tiktok", "x"],
    status: "failed",
    reviewStatus: "changes_requested",
    assignedReviewerId: "reviewer@runnerscircle.local",
    captionSet: {
      instagramCaption:
        "Runner Discipline needs a stronger motion asset before this package can go live. The message is clear. The visual needs a retry.",
      tiktokCaption:
        "The habit loop is strong. The current reel is not. Retry the asset and bring the message back with sharper movement.",
      youtubeShortsTitle: "Runner Discipline | Retry Required",
      youtubeShortsDescription:
        "This package is blocked until the failed recovery loop is replaced with a production-ready asset.",
      xPost:
        "Runner Discipline Content Series is blocked on a failed motion asset. Replace the loop, then resume the schedule.",
      emailSubject: "Runner Discipline Package Blocked",
      emailBody:
        "The promotion package cannot move forward until the failed motion asset is replaced and the operator confirms the new version.",
      websiteBlurb:
        "Runner Discipline is paused while the motion asset is repaired and re-evaluated for rollout.",
      hashtags: ["#RunnerDiscipline", "#RunnersCircle", "#RetryRequired", "#BuildAgain"],
    },
    checklist: [
      { id: "check_013", label: "Caption pack drafted", completed: true },
      { id: "check_014", label: "Failed asset flagged", completed: true },
      { id: "check_015", label: "Replacement asset linked", completed: false },
      { id: "check_016", label: "Promotion package approved", completed: false },
    ],
    assignedAgentId: "promotion-agent",
    tone: "disciplined, direct, corrective",
    callToAction: "Return stronger",
    brandProfileId: "brand_runners_circle_default",
    brandProfileName: "Runners Circle",
    brandTone: "premium",
    brandModeApplied: true,
    createdAt: "2026-05-05T19:10:00.000Z",
    updatedAt: "2026-05-05T19:24:00.000Z",
  },
];
