"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Download, FolderKanban, Megaphone } from "lucide-react";
import { agentRegistry } from "@/lib/agents/registry";
import type { CampaignResponse } from "@/lib/types/campaigns";
import type { MediaDownloadResponse, MediaAsset } from "@/lib/types/media";

interface MediaCardProps {
  asset: MediaAsset;
}

function getPromptPreview(prompt: string) {
  return prompt.length > 150 ? `${prompt.slice(0, 147)}...` : prompt;
}

function getStatusClassName(status: MediaAsset["status"]) {
  switch (status) {
    case "ready":
      return "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "processing":
      return "status-pill border-electric/20 bg-electric/10 text-electric";
    case "generated":
      return "status-pill border-orange/20 bg-orange/10 text-orange-soft";
    case "archived":
      return "status-pill border-white/10 bg-white/[0.04] text-muted";
    case "failed":
      return "status-pill border-warning/30 bg-warning/10 text-warning";
    default:
      return "status-pill";
  }
}

export function MediaCard({ asset }: MediaCardProps) {
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null);

  const assignedAgent = agentRegistry.find((agent) => agent.id === asset.assignedAgentId)?.name ?? asset.assignedAgentId;

  async function handleDownload() {
    setDownloadState("loading");
    setDownloadFeedback(null);

    try {
      const response = await fetch("/api/media/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaAssetId: asset.id,
        }),
      });

      const body = (await response.json()) as MediaDownloadResponse;

      if (!response.ok || !body.success) {
        setDownloadState("error");
        setDownloadFeedback(body.success ? "Download failed." : body.error.message);
        return;
      }

      const link = document.createElement("a");
      link.href = body.data.downloadUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.download = body.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadState("success");
      setDownloadFeedback(`Download prepared: ${body.data.fileName}`);
    } catch {
      setDownloadState("error");
      setDownloadFeedback("Unable to prepare the download right now.");
    }
  }

  async function handleSendToCampaign() {
    setCampaignState("loading");
    setCampaignFeedback(null);

    try {
      const response = await fetch("/api/campaigns/add-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: "campaign_001",
          mediaAssetId: asset.id,
        }),
      });

      const body = (await response.json()) as CampaignResponse<{
        campaign: {
          id: string;
          name: string;
          assignedMediaIds: string[];
        };
      }>;

      if (!response.ok || !body.success) {
        setCampaignState("error");
        setCampaignFeedback(body.success ? "Unable to add asset to campaign." : body.error.message);
        return;
      }

      setCampaignState("success");
      setCampaignFeedback(
        `Added to ${body.data.campaign.name}. Media count: ${body.data.campaign.assignedMediaIds.length}.`,
      );
    } catch {
      setCampaignState("error");
      setCampaignFeedback("Unable to link this asset to the default campaign right now.");
    }
  }

  return (
    <article className="panel interactive-border overflow-hidden p-5">
      <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/30">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.title}
          width={1200}
          height={900}
          unoptimized
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{asset.type}</p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">{asset.title}</h2>
        </div>
        <div className={getStatusClassName(asset.status)}>{asset.status}</div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{getPromptPreview(asset.prompt)}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned agent</p>
          <p className="mt-2 text-sm font-medium text-foreground">{assignedAgent}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Generation job</p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-foreground/80">
            {asset.generationJobId ?? "pending"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadState === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-4" />
          {downloadState === "loading" ? "Preparing download..." : "Download asset"}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSendToCampaign}
            disabled={campaignState === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:border-electric/40 hover:text-foreground"
          >
            <FolderKanban className="size-4" />
            {campaignState === "loading" ? "Sending..." : "Send to campaign"}
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:border-orange/40 hover:text-foreground"
          >
            <Megaphone className="size-4" />
            Prepare promotion
          </button>
        </div>
      </div>

      {downloadFeedback ? (
        <div
          className={
            downloadState === "error"
              ? "mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
              : "mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-foreground"
          }
        >
          <div className="flex items-center gap-2">
            {downloadState === "success" ? <ArrowUpRight className="size-4" /> : null}
            <span>{downloadFeedback}</span>
          </div>
        </div>
      ) : null}

      {campaignFeedback ? (
        <div
          className={
            campaignState === "error"
              ? "mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
              : "mt-4 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground"
          }
        >
          <div className="flex items-center gap-2">
            {campaignState === "success" ? <ArrowUpRight className="size-4" /> : null}
            <span>{campaignFeedback}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
