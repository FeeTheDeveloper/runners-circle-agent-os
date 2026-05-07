"use client";

import { useState } from "react";
import { agentRegistry } from "@/lib/agents/registry";
import type { Campaign } from "@/lib/types/campaigns";
import type { PromotionResponse } from "@/lib/types/promotions";

interface CampaignCardProps {
  campaign: Campaign;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const [promotionState, setPromotionState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [promotionFeedback, setPromotionFeedback] = useState<string | null>(null);
  const assignedAgent = agentRegistry.find((agent) => agent.id === campaign.assignedAgentId)?.name ?? campaign.assignedAgentId;

  async function handlePreparePromotion() {
    setPromotionState("loading");
    setPromotionFeedback(null);

    try {
      const response = await fetch("/api/promotions/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          mediaAssetIds: campaign.assignedMediaIds,
          channels: campaign.channels,
          tone: "premium athletic, direct, high-energy",
          callToAction: "Enter the OS",
          assignedAgentId: "promotion",
        }),
      });

      const body = (await response.json()) as PromotionResponse<{
        promotionPackage: {
          id: string;
          status: string;
        };
      }>;

      if (!response.ok || !body.success) {
        setPromotionState("error");
        setPromotionFeedback(body.success ? "Unable to prepare promotion package." : body.error.message);
        return;
      }

      setPromotionState("success");
      setPromotionFeedback(`Promotion package ${body.data.promotionPackage.id} is ${body.data.promotionPackage.status}.`);
    } catch {
      setPromotionState("error");
      setPromotionFeedback("Unable to prepare the promotion package right now.");
    }
  }

  return (
    <article className="panel interactive-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Campaign Builder</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{campaign.name}</h2>
        </div>
        <div className="status-pill">{campaign.status}</div>
      </div>

      <p className="mt-4 text-sm capitalize leading-6 text-muted">{formatLabel(campaign.objective)}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {campaign.channels.map((channel) => (
          <span key={channel} className="data-chip">
            {formatLabel(channel)}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned media</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{campaign.assignedMediaIds.length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned agent</p>
          <p className="mt-2 text-sm font-medium text-foreground">{assignedAgent}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Next action</p>
        <p className="mt-3 text-sm leading-6 text-muted">{campaign.nextAction}</p>
      </div>

      <button
        type="button"
        onClick={handlePreparePromotion}
        disabled={promotionState === "loading" || campaign.assignedMediaIds.length === 0}
        className="mt-5 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80"
      >
        {promotionState === "loading" ? "Preparing..." : "Prepare promotion"}
      </button>

      {promotionFeedback ? (
        <div
          className={
            promotionState === "error"
              ? "mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
              : "mt-4 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {promotionFeedback}
        </div>
      ) : null}
    </article>
  );
}
