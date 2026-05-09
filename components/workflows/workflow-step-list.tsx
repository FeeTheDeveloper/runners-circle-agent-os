"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { agentRegistry } from "@/lib/agents/registry";
import type { AgentExecutionPackage } from "@/lib/types/agent-execution";
import type { WorkflowRun, WorkflowStep } from "@/lib/types/workflows";

interface WorkflowStepListProps {
  run: WorkflowRun;
  executionPackages: Record<string, AgentExecutionPackage | null>;
}

interface AdvanceWorkflowResponse {
  success: boolean;
  error?: {
    message: string;
  };
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

  if (status === "running" || status === "ready") {
    return "border-electric/20 bg-electric/10 text-electric";
  }

  return "border-white/10 bg-white/[0.04] text-foreground/80";
}

function canActOnStep(run: WorkflowRun, step: WorkflowStep) {
  return run.currentStepId === step.id && ["ready", "running", "needs_review"].includes(step.status);
}

export function WorkflowStepList({ run, executionPackages }: WorkflowStepListProps) {
  const router = useRouter();
  const [payloadByStepId, setPayloadByStepId] = useState<Record<string, string>>(
    run.steps.reduce<Record<string, string>>((accumulator, step) => {
      accumulator[step.id] = JSON.stringify(
        step.output ?? {
          summary: `${step.name} completed from the workflow builder.`,
        },
        null,
        2,
      );
      return accumulator;
    }, {}),
  );
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [copiedPackageId, setCopiedPackageId] = useState<string | null>(null);

  async function copyPrompt(stepId: string, executionPackage: AgentExecutionPackage) {
    try {
      await navigator.clipboard.writeText(executionPackage.instructionPrompt);
      setCopiedPackageId(executionPackage.id);
      setFeedback((current) => ({
        ...current,
        [stepId]: "Prompt copied for manual handoff to the matching ChatGPT Agent.",
      }));
      setTimeout(() => {
        setCopiedPackageId((current) => (current === executionPackage.id ? null : current));
      }, 1600);
    } catch {
      setFeedback((current) => ({
        ...current,
        [stepId]: "Clipboard access was unavailable for this prompt copy action.",
      }));
    }
  }

  async function submitStepAction(step: WorkflowStep, action: "complete" | "needs_review" | "fail") {
    setLoadingStepId(step.id);
    setFeedback((current) => ({ ...current, [step.id]: "" }));

    try {
      let output: Record<string, unknown> = {};

      if (action !== "fail") {
        try {
          const parsed = JSON.parse(payloadByStepId[step.id] ?? "{}");
          output = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
        } catch {
          setFeedback((current) => ({
            ...current,
            [step.id]: "Output must be valid JSON before the step can be updated.",
          }));
          return;
        }
      }

      const response = await fetch(`/api/workflows/runs/${run.id}/advance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stepId: step.id,
          action,
          output,
          error: action === "fail" ? `Workflow step "${step.name}" was marked failed manually.` : undefined,
        }),
      });

      const body = (await response.json()) as AdvanceWorkflowResponse;

      if (!response.ok || !body.success) {
        setFeedback((current) => ({
          ...current,
          [step.id]: body.error?.message ?? "Unable to update this workflow step.",
        }));
        return;
      }

      router.refresh();
    } catch {
      setFeedback((current) => ({
        ...current,
        [step.id]: "Unable to update this workflow step right now.",
      }));
    } finally {
      setLoadingStepId(null);
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Workflow Steps</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Manual and assisted multi-agent sequence</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Each agent-backed step creates a real task record and execution package, but execution remains manual or assisted until a supported direct API bridge exists.
          </p>
        </div>
        <div className="status-pill">{run.steps.length} steps</div>
      </div>

      <div className="mt-6 space-y-4">
        {run.steps
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((step) => {
            const executionPackage = executionPackages[step.id] ?? null;
            const agentName = step.agentId ? agentRegistry.find((agent) => agent.id === step.agentId)?.name ?? step.agentId : null;
            const isActionable = canActOnStep(run, step);

            return (
              <article key={step.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="data-chip">{step.order}</span>
                      <span className={clsx("status-pill capitalize", getStatusTone(step.status))}>{formatLabel(step.status)}</span>
                      <span className="status-pill capitalize">{formatLabel(step.type)}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-foreground">{step.name}</h3>
                    <p className="mt-2 text-sm text-muted">
                      {agentName ?? "Manual workflow step"} {step.taskType ? `| ${formatLabel(step.taskType)}` : ""}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-muted">
                    <p>Activated: {formatTimestamp(step.activatedAt)}</p>
                    <p className="mt-1">Completed: {formatTimestamp(step.completedAt)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[0.94fr_1.06fr]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="field-label">Task and package</p>
                    <p className="mt-3 text-sm text-muted">Agent task: {step.agentTaskId ?? "No task created"}</p>
                    <p className="mt-2 text-sm text-muted">Execution package: {step.executionPackageId ?? "No package created"}</p>
                    {executionPackage ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="data-chip">{formatLabel(executionPackage.executionMode)}</span>
                        <span className="data-chip">{formatLabel(executionPackage.status)}</span>
                        <button
                          type="button"
                          onClick={() => copyPrompt(step.id, executionPackage)}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:border-electric/30 hover:text-foreground"
                        >
                          {copiedPackageId === executionPackage.id ? "Prompt copied" : "Copy prompt"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="field-label">Current output</p>
                    {step.output ? (
                      <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-black/25 p-4 text-xs leading-6 text-foreground/80 whitespace-pre-wrap">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    ) : (
                      <p className="mt-3 text-sm text-muted">No structured output has been recorded for this step yet.</p>
                    )}
                  </div>
                </div>

                {isActionable ? (
                  <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <label className="field-label" htmlFor={`${step.id}-payload`}>
                      Structured output (JSON)
                    </label>
                    <textarea
                      id={`${step.id}-payload`}
                      value={payloadByStepId[step.id] ?? "{}"}
                      onChange={(event) =>
                        setPayloadByStepId((current) => ({
                          ...current,
                          [step.id]: event.target.value,
                        }))
                      }
                      rows={10}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-foreground outline-none transition focus:border-orange/30"
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => submitStepAction(step, "complete")}
                        disabled={loadingStepId === step.id}
                        className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingStepId === step.id ? "Updating..." : "Complete step"}
                      </button>
                      <button
                        type="button"
                        onClick={() => submitStepAction(step, "needs_review")}
                        disabled={loadingStepId === step.id}
                        className="inline-flex items-center justify-center rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm font-semibold text-warning transition hover:border-warning/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark needs review
                      </button>
                      <button
                        type="button"
                        onClick={() => submitStepAction(step, "fail")}
                        disabled={loadingStepId === step.id}
                        className="inline-flex items-center justify-center rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition hover:border-danger/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark failed
                      </button>
                    </div>
                  </div>
                ) : null}

                {step.error ? (
                  <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {step.error}
                  </div>
                ) : null}

                {feedback[step.id] ? (
                  <div className="mt-4 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground">
                    {feedback[step.id]}
                  </div>
                ) : null}
              </article>
            );
          })}
      </div>
    </section>
  );
}
