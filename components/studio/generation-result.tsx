import Image from "next/image";
import type { GenerationResult as GenerationResultData, GenerationType } from "@/lib/types/generation";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";

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
  "originalPrompt",
  "enhancedPrompt",
  "status",
  "thumbnailUrl",
  "mediaUrl",
  "createdAt",
  "assignedAgentId",
  "brandProfileId",
  "brandModeApplied",
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

export function GenerationResult({ mode, result, errorMessage, isSubmitting }: GenerationResultProps) {
  return (
    <section className="panel h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Result Contract</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {mode === "image" ? "Image" : "Video"} generation preview
          </h2>
        </div>
        <div className="status-pill border-white/10 bg-white/[0.04] text-foreground/80">
          {isSubmitting ? "Submitting" : "Mock only"}
        </div>
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
            <div className={getStatusTone(result.status)}>{result.status}</div>
          </div>

          <div className="mt-4">
            <BrandModeBadges
              active={result.brandModeApplied}
              profileName={result.appliedBrandProfile ?? "No active brand"}
              tone={result.brandTone ?? "minimal"}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Original prompt</p>
              <p className="mt-3 text-sm leading-6 text-muted">{result.originalPrompt}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Enhanced prompt</p>
              <p className="mt-3 text-sm leading-6 text-muted">{result.enhancedPrompt}</p>
            </div>
          </div>

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

          {result.brandWarnings.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <p className="field-label text-warning">Brand validation notes</p>
              <div className="mt-3 space-y-2">
                {result.brandWarnings.map((warning) => (
                  <p key={warning} className="text-sm leading-6 text-foreground">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">{result.type === "video" ? "Queued job reference" : "Media reference"}</p>
            <p className="mt-3 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/80">
              {result.mediaUrl}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Current state</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {mode === "image" ? "Ready for mock asset" : "Ready for queued job"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Execution mode</p>
              <p className="mt-3 text-lg font-semibold text-foreground">Contract only</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">What returns after submit</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {mode === "image"
                ? "The image lane returns a mock completed asset contract immediately."
                : "The video lane returns a queued render contract so job-based execution can come later."}
            </p>
          </div>
        </>
      )}

      <div className="mt-5 space-y-3">
        {contractFields.map((field, index) => (
          <div key={field} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">0{index + 1}</p>
            <p className="mt-2 text-sm text-foreground">{field}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
