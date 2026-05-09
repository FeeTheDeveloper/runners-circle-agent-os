import { agentRegistry } from "@/lib/agents/registry";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { SendToDistributionButton } from "@/components/promotions/send-to-distribution-button";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewStatusBadge } from "@/components/reviews/review-status-badge";
import type { DistributionJob } from "@/lib/types/distribution";
import { getCampaignById } from "@/lib/services/campaigns";
import type { PromotionPackage } from "@/lib/types/promotions";
import type { ApprovalRequest } from "@/lib/types/team";

interface PromotionCardProps {
  promotion: PromotionPackage;
  reviewRequest?: ApprovalRequest | null;
  distributionJobs?: DistributionJob[];
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function PromotionCard({ promotion, reviewRequest = null, distributionJobs = [] }: PromotionCardProps) {
  const assignedAgent = agentRegistry.find((agent) => agent.id === promotion.assignedAgentId)?.name ?? promotion.assignedAgentId;
  const campaign = getCampaignById(promotion.campaignId);
  const completedChecklistCount = promotion.checklist.filter((item) => item.completed).length;

  return (
    <article className="panel interactive-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Promotion package</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{campaign?.name ?? promotion.campaignId}</h2>
        </div>
        <div className="status-pill">{promotion.status}</div>
      </div>

      <div className="mt-5">
        <BrandModeBadges
          active={promotion.brandModeApplied ?? false}
          profileName={promotion.brandProfileName ?? "Runners Circle"}
          tone={promotion.brandTone ?? "premium"}
          compact
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {promotion.channels.map((channel) => (
          <span key={channel} className="data-chip">
            {formatLabel(channel)}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned agent</p>
          <p className="mt-2 text-sm font-medium text-foreground">{assignedAgent}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Review state</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {reviewRequest ? <ReviewStatusBadge status={reviewRequest.status} /> : <span className="status-pill">not requested</span>}
          </div>
          <p className="mt-2 text-xs text-foreground/70">
            Reviewer: {reviewRequest?.assignedReviewerId ?? promotion.assignedReviewerId ?? "Unassigned"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Distribution handoff</p>
        <p className="mt-2 text-sm font-medium text-foreground">{distributionJobs.length} jobs created</p>
        <p className="mt-2 text-xs text-foreground/70">
          {distributionJobs.length === 0
            ? "No channel deployment jobs exist yet."
            : distributionJobs.map((job) => `${formatLabel(job.channel)} (${job.status})`).join(", ")}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Checklist progress</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {completedChecklistCount}/{promotion.checklist.length}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Caption preview</p>
        <p className="mt-3 text-sm leading-6 text-muted">{promotion.captionSet.instagramCaption}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SendToDistributionButton promotionPackageId={promotion.id} existingJobsCount={distributionJobs.length} />
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80"
        >
          Export captions
        </button>
      </div>

      <div className="mt-4">
        <RequestReviewButton
          entityType="promotion_package"
          entityId={promotion.id}
          notes={`Review promotion package for campaign ${campaign?.name ?? promotion.campaignId}.`}
        />
      </div>
    </article>
  );
}
