import Link from "next/link";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { AppShell } from "@/components/layout/app-shell";
import { WorkflowRunCard } from "@/components/workflows/workflow-run-card";
import { WorkflowTemplateCard } from "@/components/workflows/workflow-template-card";
import { getBrandModeSettings, getBrandProfile } from "@/lib/services/brand";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getLatestApprovalRequestForEntity } from "@/lib/services/reviews";
import {
  getWorkflowOperationalSummary,
  getWorkflowProgress,
  getWorkflowRuns,
  getWorkflowTemplateById,
  getWorkflowTemplates,
} from "@/lib/services/workflows";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const brandProfile = getBrandProfile(userId);
  const brandModeSettings = getBrandModeSettings(userId);
  const templates = getWorkflowTemplates();
  const workflowRuns = getWorkflowRuns();
  const reviewRequestByRunId = Object.fromEntries(
    workflowRuns.map((run) => [run.id, getLatestApprovalRequestForEntity("workflow_run", run.id)]),
  );
  const progressByRunId = Object.fromEntries(
    workflowRuns
      .map((run) => [run.id, getWorkflowProgress(run.id)] as const)
      .filter((entry): entry is readonly [string, NonNullable<ReturnType<typeof getWorkflowProgress>>] => entry[1] !== null),
  );
  const summary = getWorkflowOperationalSummary();
  const activeRuns = workflowRuns.filter((run) => ["ready", "running", "paused", "needs_review"].includes(run.status));

  return (
    <AppShell
      eyebrow="Workflows"
      title="Launch reusable multi-agent workflows across the full operating stack."
      description="Workflow Builder chains Studio briefs, agent tasks, manual execution packages, media records, campaign structure, promotion prep, and operator review into one reusable run contract."
      action={
        <Link
          href="/operator"
          className="inline-flex items-center justify-center rounded-full border border-electric/20 bg-electric/10 px-5 py-3 text-sm font-semibold text-electric transition hover:border-electric/40"
        >
          Open operator console
        </Link>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Execution Mode</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Workflows create real task and package contracts, but execution is still manual or assisted.
            </h2>
            <div className="mt-5">
              <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} />
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              Each agent-backed step creates a task record and a copyable execution package. The app does not claim live ChatGPT Agent dispatch until a supported direct integration exists.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
            <p className="field-label">Current workflow state</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="status-pill border-electric/20 bg-electric/10 text-electric">{summary.activeRuns} active</div>
              <p className="text-sm text-muted">{summary.stuckRuns} stuck or review-blocked runs need attention.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Templates</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{templates.length}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Needs review</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.needsReviewRuns}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Completed</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.completedRuns}</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.failedRuns}</p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Templates</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Start a reusable workflow run</h2>
          </div>
          <div className="status-pill">{templates.length} templates</div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {templates.map((template) => (
            <WorkflowTemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Active Runs</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Workflow runs currently moving through the stack</h2>
          </div>
          <div className="status-pill">{activeRuns.length}</div>
        </div>

        {activeRuns.length === 0 ? (
          <article className="panel mt-5 p-6">
            <p className="eyebrow">Empty State</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">No workflow runs are active yet.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Start a workflow template above to create the first run and generate step-by-step agent packages.
            </p>
          </article>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {activeRuns.map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                templateName={getWorkflowTemplateById(run.templateId)?.name ?? run.templateId}
                progress={progressByRunId[run.id] ?? null}
                reviewRequest={reviewRequestByRunId[run.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
