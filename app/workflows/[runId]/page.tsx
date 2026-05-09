import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { AppShell } from "@/components/layout/app-shell";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewStatusBadge } from "@/components/reviews/review-status-badge";
import { WorkflowProgress } from "@/components/workflows/workflow-progress";
import { WorkflowStepList } from "@/components/workflows/workflow-step-list";
import { getExecutionPackage } from "@/lib/services/agent-execution";
import { getLatestApprovalRequestForEntity } from "@/lib/services/reviews";
import { getWorkflowProgress, getWorkflowRunById, getWorkflowTemplateById } from "@/lib/services/workflows";

export const dynamic = "force-dynamic";

interface WorkflowRunPageProps {
  params: Promise<{
    runId: string;
  }>;
}

export default async function WorkflowRunPage({ params }: WorkflowRunPageProps) {
  const { runId } = await params;
  const workflowRun = getWorkflowRunById(runId);

  if (!workflowRun) {
    notFound();
  }

  const template = getWorkflowTemplateById(workflowRun.templateId);
  const progress = getWorkflowProgress(workflowRun.id);

  if (!template || !progress) {
    notFound();
  }

  const executionPackages = Object.fromEntries(
    workflowRun.steps.map((step) => [step.id, step.executionPackageId ? getExecutionPackage(step.executionPackageId) : null]),
  );
  const reviewRequest = getLatestApprovalRequestForEntity("workflow_run", workflowRun.id);
  const brandProfileName =
    typeof workflowRun.input.brandProfileName === "string" ? workflowRun.input.brandProfileName : "Runners Circle";
  const brandTone = typeof workflowRun.input.brandTone === "string" ? workflowRun.input.brandTone : "premium";
  const brandModeEnabled = typeof workflowRun.input.brandModeEnabled === "boolean" ? workflowRun.input.brandModeEnabled : false;

  return (
    <AppShell
      eyebrow="Workflow Run"
      title={template.name}
      description={template.description}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/workflows"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-foreground/80 transition hover:border-white/20 hover:text-foreground"
          >
            Back to workflows
          </Link>
          <Link
            href="/agents"
            className="inline-flex items-center justify-center rounded-full border border-electric/20 bg-electric/10 px-5 py-3 text-sm font-semibold text-electric transition hover:border-electric/40"
          >
            Open agent execution
          </Link>
          <RequestReviewButton
            entityType="workflow_run"
            entityId={workflowRun.id}
            label="Request workflow review"
            notes={`Review workflow run ${template.name} before the next command-layer handoff.`}
          />
        </div>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Run Objective</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{template.objective}</h2>
            <div className="mt-5">
              <BrandModeBadges active={brandModeEnabled} profileName={brandProfileName} tone={brandTone} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {reviewRequest ? <ReviewStatusBadge status={reviewRequest.status} /> : <span className="status-pill">review not requested</span>}
              <span className="text-xs text-foreground/70">
                Reviewer: {reviewRequest?.assignedReviewerId ?? workflowRun.assignedReviewerId ?? "Unassigned"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              This run packages each step for manual or assisted ChatGPT Agent execution, then records the outcome back into the workflow chain.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
            <p className="field-label">Connected entities</p>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>Campaign id: {typeof workflowRun.input.campaignId === "string" ? workflowRun.input.campaignId : "Pending"}</p>
              <p>
                Promotion id: {typeof workflowRun.input.promotionPackageId === "string" ? workflowRun.input.promotionPackageId : "Pending"}
              </p>
              <p>
                Media ids:{" "}
                {Array.isArray(workflowRun.input.mediaAssetIds) && workflowRun.input.mediaAssetIds.length > 0
                  ? workflowRun.input.mediaAssetIds.join(", ")
                  : "Pending"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <WorkflowProgress progress={progress} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Workflow Input</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Launch context and required outputs</h2>
            </div>
            <div className="status-pill">{template.expectedOutputs.length} outputs</div>
          </div>

          <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/8 bg-black/25 p-4 text-xs leading-6 text-foreground/80 whitespace-pre-wrap">
            {JSON.stringify(workflowRun.input, null, 2)}
          </pre>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Expected outputs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {template.expectedOutputs.map((item) => (
                  <span key={item} className="data-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Quick links</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/media" className="data-chip">
                  Media
                </Link>
                <Link href="/campaigns" className="data-chip">
                  Campaigns
                </Link>
                <Link href="/promotions" className="data-chip">
                  Promotions
                </Link>
                <Link href="/operator" className="data-chip">
                  Operator
                </Link>
              </div>
            </div>
          </div>
        </article>

        <WorkflowStepList run={workflowRun} executionPackages={executionPackages} />
      </section>
    </AppShell>
  );
}
