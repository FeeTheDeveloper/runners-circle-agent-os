import { agentRegistry } from "@/lib/agents/registry";
import { getCampaignById } from "@/lib/services/campaigns";
import type { PromotionPackage } from "@/lib/types/promotions";

interface PromotionCardProps {
  promotion: PromotionPackage;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function PromotionCard({ promotion }: PromotionCardProps) {
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
          <p className="field-label">Checklist progress</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {completedChecklistCount}/{promotion.checklist.length}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Caption preview</p>
        <p className="mt-3 text-sm leading-6 text-muted">{promotion.captionSet.instagramCaption}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80"
        >
          Review package
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80"
        >
          Export captions
        </button>
      </div>
    </article>
  );
}
