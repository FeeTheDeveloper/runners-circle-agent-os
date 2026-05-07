import type { RenderQueueSnapshot } from "@/lib/services/operator";
import type { VideoGenerationJob } from "@/lib/types/generation";

interface RenderQueuePanelProps {
  snapshot: RenderQueueSnapshot;
}

function summarizePrompt(prompt: string) {
  if (prompt.length <= 90) {
    return prompt;
  }

  return `${prompt.slice(0, 87)}...`;
}

function JobRow({ job, kind }: { job: VideoGenerationJob; kind: "queued" | "active" | "failed" }) {
  const tone =
    kind === "failed"
      ? "border-warning/30 bg-warning/10 text-warning"
      : kind === "active"
        ? "border-orange/20 bg-orange/10 text-orange-soft"
        : "border-electric/20 bg-electric/10 text-electric";

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{summarizePrompt(job.prompt) || "Video job"}</p>
        <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-xs text-foreground/70">
          {job.id}
        </p>
        {job.errorMessage ? (
          <p className="mt-2 text-xs text-warning">{job.errorMessage}</p>
        ) : (
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
            {job.format} · {job.duration}s · {job.provider}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className={`status-pill ${tone}`}>{job.status}</div>
        <p className="font-[family-name:var(--font-mono)] text-xs text-foreground">{job.progress}%</p>
      </div>
    </div>
  );
}

export function RenderQueuePanel({ snapshot }: RenderQueuePanelProps) {
  const activeAndQueued = [...snapshot.active, ...snapshot.queued];

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Render Queue</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Video jobs in flight</h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
            depth {snapshot.depth}
          </div>
          <p className="font-[family-name:var(--font-mono)] text-xs text-foreground/70">
            completed today · {snapshot.completedToday}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-white/8 bg-black/20 p-4">
          <p className="eyebrow">Queued + active</p>
          {activeAndQueued.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-muted">
              No queued or active video jobs. Submit one from the Studio to populate this panel.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {activeAndQueued.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  kind={job.status === "queued" ? "queued" : "active"}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/8 bg-black/20 p-4">
          <p className="eyebrow">Failed renders</p>
          {snapshot.failed.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-muted">
              No failed renders. Retry / cancel actions appear here when a job lands in the failed state.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {snapshot.failed.map((job) => (
                <JobRow key={job.id} job={job} kind="failed" />
              ))}
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-muted">
            Retry and cancel buttons are wired through `lib/services/render-queue.ts` (mock today; ready for cron, Supabase Edge Functions, or an external worker).
          </p>
        </div>
      </div>
    </section>
  );
}
