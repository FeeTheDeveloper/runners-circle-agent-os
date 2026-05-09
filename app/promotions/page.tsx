import { promotionChannels, type PromotionStatus } from "@/lib/types/promotions";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { AppShell } from "@/components/layout/app-shell";
import { PromotionCard } from "@/components/promotions/promotion-card";
import { getBrandModeSettings, getBrandProfile } from "@/lib/services/brand";
import { getDistributionJobs } from "@/lib/services/distribution";
import { getPromotionPackages } from "@/lib/services/promotions";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getLatestApprovalRequestForEntity } from "@/lib/services/reviews";

export const dynamic = "force-dynamic";

const statusSummary: Array<{
  label: string;
  statuses: PromotionStatus[];
  detail: string;
}> = [
  {
    label: "Total packages",
    statuses: ["draft", "prepared", "ready_for_review", "approved", "scheduled", "published", "failed"],
    detail: "All promotion packages in the outbound pipeline",
  },
  {
    label: "Prepared",
    statuses: ["prepared"],
    detail: "Packages assembled by the Promotion Agent",
  },
  {
    label: "Review queue",
    statuses: ["ready_for_review"],
    detail: "Waiting on operator review before approval",
  },
  {
    label: "Approved or live",
    statuses: ["approved", "scheduled", "published"],
    detail: "Promotion packages cleared for outbound use",
  },
];

function formatChannelLabel(channel: (typeof promotionChannels)[number]) {
  return channel.replaceAll("_", " ");
}

export default async function PromotionsPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const brandProfile = getBrandProfile(userId);
  const brandModeSettings = getBrandModeSettings(userId);
  const promotionPackages = getPromotionPackages();
  const distributionJobs = getDistributionJobs();
  const reviewRequestByPromotionId = Object.fromEntries(
    promotionPackages.map((promotionPackage) => [
      promotionPackage.id,
      getLatestApprovalRequestForEntity("promotion_package", promotionPackage.id),
    ]),
  );
  const distributionJobsByPromotionId = distributionJobs.reduce<Record<string, typeof distributionJobs>>((groups, job) => {
    if (!groups[job.promotionPackageId]) {
      groups[job.promotionPackageId] = [];
    }

    groups[job.promotionPackageId].push(job);
    return groups;
  }, {});

  return (
    <AppShell
      eyebrow="Promotions"
      title="Prepare channel-ready promotion packages from campaign media."
      description="The Promotion Agent pipeline converts approved campaign media into channel-specific copy packs, review checklists, export-ready package contracts, and distribution handoff jobs without forcing live publishing automation."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} compact />
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-foreground/80"
          >
            Prepare package UI soon
          </button>
        </div>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <p className="eyebrow">Promotion Dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Promotion packages turn campaign structure into channel-ready execution copy.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          This layer keeps the social, email, and website copy contract visible before any live publishing automation
          is introduced, while still handing approved packages into the distribution queue.
        </p>
        <div className="mt-5">
          <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} compact />
        </div>
      </section>

      <section className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statusSummary.map((item) => {
          const count = promotionPackages.filter((promotionPackage) => item.statuses.includes(promotionPackage.status)).length;

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
        {promotionPackages.length === 0 ? (
          <article className="panel p-6">
            <p className="eyebrow">Empty State</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">No promotion packages have been prepared yet.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Prepare a package from a campaign card to start generating channel-ready copy and review checklists.
            </p>
          </article>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {promotionPackages.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                reviewRequest={reviewRequestByPromotionId[promotion.id] ?? null}
                distributionJobs={distributionJobsByPromotionId[promotion.id] ?? []}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Channel Readiness</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Where each outbound lane stands right now</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {promotionChannels.map((channel) => {
              const packageCount = promotionPackages.filter((promotionPackage) => promotionPackage.channels.includes(channel)).length;
              const readyCount = promotionPackages.filter(
                (promotionPackage) =>
                  promotionPackage.channels.includes(channel) &&
                  ["approved", "scheduled", "published"].includes(promotionPackage.status),
              ).length;

              return (
                <div key={channel} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm font-semibold capitalize text-foreground">{formatChannelLabel(channel)}</p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{packageCount}</p>
                  <p className="mt-2 text-sm text-muted">{readyCount} ready or live packages</p>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
