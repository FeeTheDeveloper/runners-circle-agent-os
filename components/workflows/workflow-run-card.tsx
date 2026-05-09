import Link from "next/link";
import { agentRegistry } from "@/lib/agents/registry";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewStatusBadge } from "@/components/reviews/review-status-badge";
import type { ApprovalRequest } from "@/lib/types/team";
import type { WorkflowProgress, WorkflowRun } from "@/lib/types/workflows";

interface WorkflowRunCardProps {
  run: WorkflowRun;
  templateName: string;
  progress: WorkflowProgress | null;
  reviewRequest?: ApprovalRequest | null;
  compact?: boolean;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLatestCompletedStep(run: WorkflowRun) {
  return run.steps
    .filter((step) => step.status === "completed")
    .sort(
      (left, right) =>
        Date.parse(right.completedAt ?? right.activatedAt ?? run.updatedAt) -
        Date.parse(left.completedAt ?? left.activatedAt ?? run.updatedAt),
    )[0] ?? null;
}

export function WorkflowRunCard({ run, templateName, progress, reviewRequest = null, compact = false }: WorkflowRunCardProps) {
  const currentAgentName =
    progress?.currentAgentId
      ? agentRegistry.find((agent) => agent.id === progress.currentAgentId)?.name ?? progress.currentAgentId
      : "No active agent";
  const brandProfileName =
    typeof run.input.brandProfileName === "string" ? run.input.brandProfileName : "Runners Circle";
  const brandTone = typeof run.input.brandTone === "string" ? run.input.brandTone : "premium";
  const brandModeEnabled = typeof run.input.brandModeEnabled === "boolean" ? run.input.brandModeEnabled : false;
  const latestCompletedStep = getLatestCompletedStep(run);
  const latestOutputKeys = latestCompletedStep?.output ? Object.keys(latestCompletedStep.output).slice(0, 4) : [];

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Workflow Run</p>
          <h2 className={compact ? "mt-3 text-xl font-semibold text-foreground" : "mt-3 text-2xl font-semibold text-foreground"}>
            {templateName}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {run.id} | Updated {formatTimestamp(run.updatedAt)}
          </p>
        </div>
        <div className="status-pill capitalize">{progress?.status.replaceAll("_", " ") ?? run.status.replaceAll("_", " ")}</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Current agent</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{currentAgentName}</p>
          <p className="mt-2 text-sm text-muted">{progress?.currentStepName ?? "No active step"}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Review state</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {reviewRequest ? <ReviewStatusBadge status={reviewRequest.status} /> : <span className="status-pill">not requested</span>}
          </div>
          <p className="mt-2 text-xs text-foreground/70">
            Reviewer: {reviewRequest?.assignedReviewerId ?? run.assignedReviewerId ?? "Unassigned"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Next action</p>
        <p className="mt-2 text-sm leading-6 text-muted">{progress?.nextAction ?? "Open the workflow for details."}</p>
      </div>

      <div className="mt-5">
        <BrandModeBadges active={brandModeEnabled} profileName={brandProfileName} tone={brandTone} compact />
      </div>

      {latestCompletedStep ? (
        <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Latest output</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{latestCompletedStep.name}</p>
          {latestOutputKeys.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {latestOutputKeys.map((item) => (
                <span key={item} className="data-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">This step completed without structured output keys.</p>
          )}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-sm text-muted">
          {progress ? `${progress.completedSteps}/${progress.totalSteps} steps completed` : `${run.steps.length} configured steps`}
        </div>
        <div className="flex items-center gap-3">
          <RequestReviewButton
            entityType="workflow_run"
            entityId={run.id}
            notes={`Review workflow run ${templateName} before the next command-layer handoff.`}
            compact
          />
          <Link href={`/workflows/${run.id}`} className="text-sm font-medium text-electric transition hover:text-electric/80">
            Open workflow
          </Link>
        </div>
      </div>
    </article>
  );
}
