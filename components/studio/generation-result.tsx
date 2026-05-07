"use client";

import { useState } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import type { GenerationResult as GenerationResultData, GenerationType } from "@/lib/types/generation";
import type { MediaDownloadResponse } from "@/lib/types/media";

interface GenerationResultProps {
  mode: GenerationType;
  result: GenerationResultData | null;
  errorMessage: string | null;
  isSubmitting: boolean;
}

const contractFields = [
  "id",
  "type",
  "title",
  "prompt",
  "status",
  "thumbnailUrl",
  "mediaUrl",
  "createdAt",
  "assignedAgentId",
  "provider",
  "persisted",
  "storageReady",
];

function getStatusTone(status: GenerationResultData["status"]) {
  switch (status) {
    case "completed":
      return "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "queued":
      return "status-pill border-electric/20 bg-electric/10 text-electric";
    case "processing":
      return "status-pill border-orange/20 bg-orange/10 text-orange-soft";
    case "failed":
      return "status-pill border-warning/30 bg-warning/10 text-warning";
    default:
      return "status-pill";
  }
}

function getProviderTone(provider: GenerationResultData["provider"]) {
  return provider === "openai"
    ? "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : "status-pill border-electric/20 bg-electric/10 text-electric";
}

function getStorageTone(ready: boolean) {
  return ready
    ? "status-pill border-orange/20 bg-orange/10 text-orange-soft"
    : "status-pill border-white/10 bg-white/[0.04] text-foreground/70";
}

export function GenerationResult({ mode, result, errorMessage, isSubmitting }: GenerationResultProps) {
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  async function handleDownload() {
    if (!result?.assetId) {
      setDownloadState("error");
      setDownloadFeedback("This result is not persisted yet — no asset id is available.");
      return;
    }

    setDownloadState("loading");
    setDownloadFeedback(null);

    try {
      const response = await fetch("/api/media/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId: result.assetId }),
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

  const headerBadge = (() => {
    if (isSubmitting) {
      return <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/80">Submitting</div>;
    }

    if (!result) {
      return <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/80">Awaiting input</div>;
    }

    if (result.provider === "mock") {
      return (
        <div className="status-pill border-electric/20 bg-electric/10 text-electric">
          Mock mode active
        </div>
      );
    }

    return (
      <div className="status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Live OpenAI</div>
    );
  })();

  return (
    <section className="panel h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Result Contract</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {mode === "image" ? "Image" : "Video"} generation preview
          </h2>
        </div>
        {headerBadge}
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="field-label text-warning">Request error</p>
          <p className="mt-3 text-sm leading-6 text-foreground">{errorMessage}</p>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mt-5 overflow-hidden rounded-[28px] border border-white/8 bg-black/20">
            <Image
              src={result.thumbnailUrl}
              alt={result.title}
              width={1200}
              height={900}
              unoptimized
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="field-label">Latest result</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">{result.title}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={getStatusTone(result.status)}>{result.status}</div>
              <div className={getProviderTone(result.provider)}>{result.provider}</div>
              <div className={getStorageTone(result.storageReady)}>
                {result.storageReady ? "stored" : "no upload"}
              </div>
              {result.persisted ? (
                <div className="status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200">persisted</div>
              ) : (
                <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/70">in-memory</div>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">{result.prompt}</p>

          {result.revisedPrompt ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Provider revised prompt</p>
              <p className="mt-3 text-sm leading-6 text-muted">{result.revisedPrompt}</p>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Assigned agent</p>
              <p className="mt-3 font-[family-name:var(--font-mono)] text-sm text-foreground">{result.assignedAgentId}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Created</p>
              <p className="mt-3 text-sm text-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(result.createdAt))}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">{result.type === "video" ? "Queued job reference" : "Media reference"}</p>
            <p className="mt-3 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/80">
              {result.mediaUrl}
            </p>
            {result.storagePath ? (
              <p className="mt-2 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/60">
                bucket: {result.storageBucket} · path: {result.storagePath}
              </p>
            ) : null}
          </div>

          {result.assetId ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadState === "loading"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="size-4" />
                {downloadState === "loading" ? "Preparing download..." : "Download asset"}
              </button>

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
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Current state</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {mode === "image" ? "Ready for OpenAI image" : "Ready for queued job"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Execution mode</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {mode === "image" ? "OpenAI when configured" : "Contract only"}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">What returns after submit</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {mode === "image"
                ? "When OPENAI_API_KEY is set, the image lane runs gpt-image-1, uploads the result to Supabase Storage, and persists a media_assets record. Without the key, the lane returns a mock completed asset contract."
                : "The video lane returns a queued render contract so job-based execution can come later."}
            </p>
          </div>
        </>
      )}

      <div className="mt-5 space-y-3">
        {contractFields.map((field, index) => (
          <div key={field} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{String(index + 1).padStart(2, "0")}</p>
            <p className="mt-2 text-sm text-foreground">{field}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
