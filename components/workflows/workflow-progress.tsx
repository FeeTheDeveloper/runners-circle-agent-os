import clsx from "clsx";
import { agentRegistry } from "@/lib/agents/registry";
import type { WorkflowProgress as WorkflowProgressSnapshot } from "@/lib/types/workflows";

interface WorkflowProgressProps {
  progress: WorkflowProgressSnapshot;
}

function getStatusTone(status: string) {
  if (status === "failed") {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (status === "completed") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "needs_review") {
    return "border-warning/30 bg-warning/10 text-warning";
  }

  if (status === "running") {
    return "border-orange/20 bg-orange/10 text-orange-soft";
  }

  if (status === "ready") {
    return "border-electric/20 bg-electric/10 text-electric";
  }

  return "border-white/10 bg-white/[0.04] text-foreground/80";
}

export function WorkflowProgress({ progress }: WorkflowProgressProps) {
  const currentAgentName =
    progress.currentAgentId
      ? agentRegistry.find((agent) => agent.id === progress.currentAgentId)?.name ?? progress.currentAgentId
      : "No active agent";

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Workflow Progress</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{progress.percentComplete}% complete</h2>
        </div>
        <div className={clsx("status-pill capitalize", getStatusTone(progress.status))}>{progress.status.replaceAll("_", " ")}</div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progress.percentComplete}%` }} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {progress.completedSteps}/{progress.totalSteps}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Needs review</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{progress.needsReviewSteps}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{progress.failedSteps}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{progress.pendingSteps}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Current step</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{progress.currentStepName ?? "No active step"}</p>
          <p className="mt-2 text-sm text-muted">{currentAgentName}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Next action</p>
          <p className="mt-2 text-sm leading-6 text-muted">{progress.nextAction}</p>
        </div>
      </div>
    </article>
  );
}
