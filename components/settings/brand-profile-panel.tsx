"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { brandModeStrictnessLevels, brandTones, type BrandModeSettings, type BrandProfile } from "@/lib/types/brand";
import { promotionChannels } from "@/lib/types/promotions";

interface BrandProfilePanelProps {
  initialBrandProfile: BrandProfile;
  initialBrandModeSettings: BrandModeSettings;
}

interface BrandProfileResponse {
  success: boolean;
  data?: {
    brandProfile: BrandProfile;
    brandModeSettings: BrandModeSettings;
  };
  error?: {
    message: string;
  };
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-orange/40";

const motionOptions = [
  "Cinematic acceleration",
  "Pulse graphics",
  "Disciplined launch pacing",
  "Luxury minimal motion",
  "Urban sprint cutdowns",
] as const;

const brandModeFlagFields = [
  { key: "injectPromptModifiers", label: "Inject prompt modifiers" },
  { key: "enforceBrandVoice", label: "Enforce brand voice" },
  { key: "enforceColorDirection", label: "Enforce color direction" },
  { key: "enforceMotionStyle", label: "Enforce motion style" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<
    BrandModeSettings,
    "injectPromptModifiers" | "enforceBrandVoice" | "enforceColorDirection" | "enforceMotionStyle"
  >;
  label: string;
}>;

export function BrandProfilePanel({ initialBrandProfile, initialBrandModeSettings }: BrandProfilePanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialBrandProfile);
  const [modeSettings, setModeSettings] = useState(initialBrandModeSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateProfileField<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function togglePreferredPlatform(platform: (typeof promotionChannels)[number]) {
    setProfile((current) => ({
      ...current,
      preferredPlatforms: current.preferredPlatforms.includes(platform)
        ? current.preferredPlatforms.filter((entry) => entry !== platform)
        : [...current.preferredPlatforms, platform],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/brand/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: {
            name: profile.name,
            description: profile.description,
            primaryColor: profile.primaryColor,
            secondaryColor: profile.secondaryColor,
            accentColor: profile.accentColor,
            typographyStyle: profile.typographyStyle,
            visualStyle: profile.visualStyle,
            motionStyle: profile.motionStyle,
            tone: profile.tone,
            tagline: profile.tagline,
            audience: profile.audience,
            keywords: profile.keywords,
            bannedWords: profile.bannedWords,
            preferredPlatforms: profile.preferredPlatforms,
            logoUrl: profile.logoUrl,
            brandVoiceNotes: profile.brandVoiceNotes,
            callToActionStyle: profile.callToActionStyle,
          },
          modeSettings,
        }),
      });

      const body = (await response.json()) as BrandProfileResponse;

      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message ?? "Unable to update the brand profile.");
        return;
      }

      setProfile(body.data.brandProfile);
      setModeSettings(body.data.brandModeSettings);
      setFeedback("Brand profile and brand mode settings updated.");
      router.refresh();
    } catch {
      setError("Unable to update the brand profile right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Brand Profile</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Brand Mode Engine configuration</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Brand Mode influences prompts, media records, campaign packaging, captions, workflows, and promotion copy while mock fallback mode remains available.
          </p>
        </div>
        <div className="status-pill">{profile.slug}</div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="brand-name" className="field-label">
                Brand name
              </label>
              <input
                id="brand-name"
                value={profile.name}
                onChange={(event) => updateProfileField("name", event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="brand-tone" className="field-label">
                Tone selector
              </label>
              <select
                id="brand-tone"
                value={profile.tone}
                onChange={(event) => updateProfileField("tone", event.target.value as BrandProfile["tone"])}
                className={fieldClassName}
              >
                {brandTones.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="brand-description" className="field-label">
              Description
            </label>
            <textarea
              id="brand-description"
              rows={4}
              value={profile.description}
              onChange={(event) => updateProfileField("description", event.target.value)}
              className={fieldClassName}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="brand-motion-style" className="field-label">
                Motion style selector
              </label>
              <select
                id="brand-motion-style"
                value={profile.motionStyle}
                onChange={(event) => updateProfileField("motionStyle", event.target.value)}
                className={fieldClassName}
              >
                {[profile.motionStyle, ...motionOptions.filter((option) => option !== profile.motionStyle)].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="brand-cta-style" className="field-label">
                CTA style
              </label>
              <input
                id="brand-cta-style"
                value={profile.callToActionStyle}
                onChange={(event) => updateProfileField("callToActionStyle", event.target.value)}
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="brand-tagline" className="field-label">
                Tagline
              </label>
              <input
                id="brand-tagline"
                value={profile.tagline}
                onChange={(event) => updateProfileField("tagline", event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="brand-audience" className="field-label">
                Audience
              </label>
              <input
                id="brand-audience"
                value={profile.audience}
                onChange={(event) => updateProfileField("audience", event.target.value)}
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="brand-keywords" className="field-label">
              Brand keywords
            </label>
            <textarea
              id="brand-keywords"
              rows={3}
              value={profile.keywords.join(", ")}
              onChange={(event) =>
                updateProfileField(
                  "keywords",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
              className={fieldClassName}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="brand-banned-words" className="field-label">
              Banned words
            </label>
            <textarea
              id="brand-banned-words"
              rows={3}
              value={profile.bannedWords.join(", ")}
              onChange={(event) =>
                updateProfileField(
                  "bannedWords",
                  event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
              className={fieldClassName}
            />
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Brand Mode</p>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Brand Mode toggle</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Enables prompt modifiers, voice rules, color direction, motion rules, and workflow inheritance.
                </p>
              </div>
              <button
                type="button"
                aria-pressed={modeSettings.enabled}
                onClick={() =>
                  setModeSettings((current) => ({
                    ...current,
                    enabled: !current.enabled,
                  }))
                }
                className={
                  modeSettings.enabled
                    ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
                    : "status-pill border-white/10 bg-white/[0.04] text-muted"
                }
              >
                {modeSettings.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="brand-strictness" className="field-label">
                  Strictness
                </label>
                <select
                  id="brand-strictness"
                  value={modeSettings.strictness}
                  onChange={(event) =>
                    setModeSettings((current) => ({
                      ...current,
                      strictness: event.target.value as BrandModeSettings["strictness"],
                    }))
                  }
                  className={fieldClassName}
                >
                  {brandModeStrictnessLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="brand-platforms" className="field-label">
                  Platform preference
                </label>
                <div id="brand-platforms" className="flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-black/20 p-3">
                  {promotionChannels.map((platform) => {
                    const active = profile.preferredPlatforms.includes(platform);

                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePreferredPlatform(platform)}
                        className={
                          active
                            ? "status-pill border-electric/20 bg-electric/10 text-electric"
                            : "status-pill border-white/10 bg-white/[0.04] text-muted"
                        }
                      >
                        {platform.replaceAll("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Enforcement switches</p>
            <div className="mt-4 space-y-3">
              {brandModeFlagFields.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setModeSettings((current) => ({
                      ...current,
                      [item.key]: !current[item.key],
                    }))
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left transition hover:border-orange/30"
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span
                    className={
                      modeSettings[item.key]
                        ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
                        : "status-pill border-white/10 bg-white/[0.04] text-muted"
                    }
                  >
                    {modeSettings[item.key] ? "On" : "Off"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Voice notes</p>
            <textarea
              rows={6}
              value={profile.brandVoiceNotes}
              onChange={(event) => updateProfileField("brandVoiceNotes", event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-foreground outline-none transition focus:border-orange/30"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save brand profile"}
        </button>
        <div className="status-pill">{profile.preferredPlatforms.length} preferred platforms</div>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
    </section>
  );
}
