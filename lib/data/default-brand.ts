import type { BrandModeSettings, BrandProfile } from "@/lib/types/brand";

const timestamp = "2026-05-07T12:00:00.000Z";

export const defaultBrandProfile: BrandProfile = {
  id: "brand_runners_circle_default",
  userId: "mock-user",
  name: "Runners Circle",
  slug: "runners-circle",
  description:
    "Premium athletic command-center energy built around urban running culture, disciplined language, cinematic motion, and dark-mode launch surfaces.",
  primaryColor: "#f97316",
  secondaryColor: "#0f172a",
  accentColor: "#00d4ff",
  typographyStyle: "Condensed editorial athletic typography with technical mono accents.",
  visualStyle:
    "Dark-mode urban running culture with charcoal environments, premium athletic styling, orange edge light, electric accent details, and command-center framing.",
  motionStyle:
    "Cinematic acceleration, pulse graphics, fast disciplined cuts, premium product detail, and confident end-card pacing.",
  tone: "premium",
  tagline: "Run the system. Move the circle.",
  audience: "Urban runners, performance-minded creators, and operator-led fitness brands.",
  keywords: ["premium athletic", "urban run culture", "command-center", "cinematic motion", "disciplined energy"],
  bannedWords: ["inspiring", "inspiration", "journey", "vibes", "hustle", "limitless", "dream big", "believe"],
  preferredPlatforms: ["instagram", "tiktok", "youtube_shorts", "website"],
  logoUrl: "/assets/placeholders/generated-image-1.svg",
  brandVoiceNotes:
    "Use disciplined, command-driven language. Stay premium and direct. Avoid weak motivational fluff, vague hype, or soft lifestyle filler.",
  callToActionStyle: "Short, action-first, command-driven CTAs with clean endings and no exclamation spam.",
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const defaultBrandModeSettings: BrandModeSettings = {
  enabled: true,
  strictness: "balanced",
  injectPromptModifiers: true,
  enforceBrandVoice: true,
  enforceColorDirection: true,
  enforceMotionStyle: true,
};
