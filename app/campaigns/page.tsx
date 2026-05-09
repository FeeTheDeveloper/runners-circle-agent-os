import type { CampaignStatus } from "@/lib/types/campaigns";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { AppShell } from "@/components/layout/app-shell";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { getBrandModeSettings, getBrandProfile } from "@/lib/services/brand";
import { getCampaigns } from "@/lib/services/campaigns";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getLatestApprovalRequestForEntity } from "@/lib/services/reviews";

export const dynamic = "force-dynamic";

const statusSummary: Array<{
  label: string;
  statuses: CampaignStatus[];
  detail: string;
}> = [
  {
    label: "Total campaigns",
    statuses: ["draft", "building", "ready", "active", "paused", "completed", "failed"],
    detail: "All mock campaign records in the builder pipeline",
  },
  {
    label: "Building",
    statuses: ["building"],
    detail: "Actively being assembled by the Campaign Builder Agent",
  },
  {
    label: "Ready or active",
    statuses: ["ready", "active"],
    detail: "Structured campaigns ready for handoff or already in motion",
  },
  {
    label: "Needs attention",
    statuses: ["paused", "failed"],
    detail: "Campaigns blocked on assets, decisions, or operator follow-up",
  },
];

export default async function CampaignsPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const brandProfile = getBrandProfile(userId);
  const brandModeSettings = getBrandModeSettings(userId);
  const campaigns = getCampaigns();
  const reviewRequestByCampaignId = Object.fromEntries(
    campaigns.map((campaign) => [campaign.id, getLatestApprovalRequestForEntity("campaign", campaign.id)]),
  );

  return (
    <AppShell
      eyebrow="Campaigns"
      title="Turn generated media into structured campaign packages."
      description="The Campaign Builder pipeline groups approved assets, maps them to channels, and preserves the operator brief for downstream promotion prep without touching live publishing yet."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} compact />
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-foreground/80"
          >
            Create campaign UI soon
          </button>
        </div>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <p className="eyebrow">Campaign Builder</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Campaigns sit between the media library and promotion execution.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          This surface is where asset groups become channel plans, objectives, and next actions owned by the Campaign
          Builder Agent.
        </p>
        <div className="mt-5">
          <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} compact />
        </div>
      </section>

      <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statusSummary.map((item) => {
          const count = campaigns.filter((campaign) => item.statuses.includes(campaign.status)).length;

          return (
            <article key={item.label} className="panel p-5">
              <p className="field-label">{item.label}</p>
              <p className="metric-value mt-3">{count}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-5">
        {campaigns.length === 0 ? (
          <article className="panel p-6">
            <p className="eyebrow">Empty State</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">No campaigns have been assembled yet.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Add approved media to the Campaign Builder pipeline to start creating channel-ready campaign structures.
            </p>
          </article>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} reviewRequest={reviewRequestByCampaignId[campaign.id] ?? null} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
