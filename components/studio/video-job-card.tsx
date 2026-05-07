"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, RefreshCcw, Zap } from "lucide-react";
import type { MediaDownloadResponse } from "@/lib/types/media";
import type {
  VideoGenerationJob,
  VideoJobStatus,
} from "@/lib/types/generation";

interface VideoJobCardProps {
  job: VideoGenerationJob;
  onJobUpdate: (job: VideoGenerationJob) => void;
}

interface JobApiResponse {
  success: boolean;
  data?: { job: VideoGenerationJob };
  error?: { message: string };
}

const ACTIVE_STATUSES: VideoJobStatus[] = ["queued", "processing", "rendering", "uploading"];

function getStatusTone(status: VideoJobStatus) {
  switch (status) {
    case "completed":
      return "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "queued":
      return "status-pill border-electric/20 bg-electric/10 text-electric";
    case "processing":
    case "rendering":
    case "uploading":
      return "status-pill border-orange/20 bg-orange/10 text-orange-soft";
    case "failed":
      return "status-pill border-warning/30 bg-warning/10 text-warning";
    case "cancelled":
      return "status-pill border-white/10 bg-white/[0.04] text-foreground/70";
    default:
      return "status-pill";
  }
}

function describeProgress(status: VideoJobStatus) {
  switch (status) {
    case "queued":
      return "Job has been accepted and is waiting for a render slot.";
    case "processing":
      return "Worker is preparing prompt + assets.";
    case "rendering":
      return "Provider is rendering the video frames.";
    case "uploading":
      return "Worker is uploading the rendered video to Supabase Storage.";
    case "completed":
      return "Render is finished and a media asset has been linked.";
    case "failed":
      return "Render failed. Inspect the error message and retry from the operator console.";
    case "cancelled":
      return "Job was cancelled before render completed.";
    default:
      return "";
  }
}

export function VideoJobCard({ job, onJobUpdate }: VideoJobCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isActive = ACTIVE_STATUSES.includes(job.status);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate/video/${job.id}`, { method: "GET" });
        const body = (await response.json()) as JobApiResponse;
        if (body.success && body.data) {
          onJobUpdate(body.data.job);
        }
      } catch {
        // ignore poll failures; user can retry manually
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isActive, job.id, onJobUpdate]);

  async function handleCheckStatus() {
    setIsChecking(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/generate/video/${job.id}`, { method: "GET" });
      const body = (await response.json()) as JobApiResponse;

      if (!body.success || !body.data) {
        setFeedback(body.error?.message ?? "Unable to refresh job status.");
        return;
      }

      onJobUpdate(body.data.job);
    } catch {
      setFeedback("Unable to refresh job status right now.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleProcessStep() {
    setIsProcessing(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/generate/video/${job.id}/process`, { method: "POST" });
      const body = (await response.json()) as JobApiResponse;

      if (!body.success || !body.data) {
        setFeedback(body.error?.message ?? "Unable to advance the job.");
        return;
      }

      onJobUpdate(body.data.job);
    } catch {
      setFeedback("Unable to advance the job right now.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDownload() {
    if (!job.outputMediaAssetId) {
      setDownloadState("error");
      setDownloadFeedback("This job has no linked media asset yet.");
      return;
    }

    setDownloadState("loading");
    setDownloadFeedback(null);

    try {
      const response = await fetch("/api/media/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId: job.outputMediaAssetId }),
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

  const progress = Math.max(0, Math.min(100, job.progress));

  return (
    <section className="panel h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Video Job</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Render pipeline</h2>
        </div>
        <div className={getStatusTone(job.status)}>{job.status}</div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="field-label">Progress</p>
          <p className="font-[family-name:var(--font-mono)] text-xs text-foreground">{progress}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-orange transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{describeProgress(job.status)}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Provider</p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-sm text-foreground">{job.provider}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Format · duration</p>
          <p className="mt-2 text-sm text-foreground">
            {job.format} · {job.duration}s
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Assigned agent</p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-sm text-foreground">{job.assignedAgentId}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Job id</p>
          <p className="mt-2 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/80">{job.id}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Prompt</p>
        <p className="mt-3 text-sm leading-6 text-muted">{job.prompt}</p>
      </div>

      {job.errorMessage ? (
        <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="field-label text-warning">Render error</p>
          <p className="mt-3 text-sm leading-6 text-foreground">{job.errorMessage}</p>
        </div>
      ) : null}

      {job.status === "completed" && job.outputMediaAssetId ? (
        <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Linked media asset</p>
          <p className="mt-2 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/80">
            {job.outputMediaAssetId}
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/8">
            <Image
              src={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'><rect width='1200' height='900' rx='52' fill='#111827'/><text x='86' y='450' fill='#67e8f9' font-size='42' font-family='Arial, sans-serif'>Mock video preview · ${job.id.slice(0, 8)}</text></svg>`,
              )}`}
              alt="Generated video preview"
              width={1200}
              height={900}
              unoptimized
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 transition hover:border-electric/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="size-4" />
          {isChecking ? "Checking..." : "Check status"}
        </button>

        {job.provider === "mock" ? (
          <button
            type="button"
            onClick={handleProcessStep}
            disabled={isProcessing || !isActive}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-orange/20 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange-soft transition hover:border-orange/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Zap className="size-4" />
            {isProcessing ? "Advancing..." : "Process mock step"}
          </button>
        ) : null}
      </div>

      {job.outputMediaAssetId ? (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadState === "loading"}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="size-4" />
          {downloadState === "loading" ? "Preparing download..." : "Download asset"}
        </button>
      ) : null}

      {feedback ? (
        <div className="mt-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {feedback}
        </div>
      ) : null}

      {downloadFeedback ? (
        <div
          className={
            downloadState === "error"
              ? "mt-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
              : "mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {downloadFeedback}
        </div>
      ) : null}
    </section>
  );
}
