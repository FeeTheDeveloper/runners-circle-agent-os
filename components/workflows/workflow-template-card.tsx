"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowRun, WorkflowTemplate } from "@/lib/types/workflows";
import { agentTaskPriorities, type AgentTaskPriority } from "@/lib/types/agents";

interface WorkflowTemplateCardProps {
  template: WorkflowTemplate;
  compact?: boolean;
}

interface CreateWorkflowRunResponse {
  success: boolean;
  data?: {
    workflowRun: WorkflowRun;
  };
  error?: {
    message: string;
  };
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function WorkflowTemplateCard({ template, compact = false }: WorkflowTemplateCardProps) {
  const router = useRouter();
  const [brief, setBrief] = useState(template.description);
  const [priority, setPriority] = useState<AgentTaskPriority>(template.defaultPriority);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartWorkflow() {
    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/workflows/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: template.id,
          input: {
            brief,
            prompt: brief,
            campaignName: `${template.name} Run`,
            priority,
          },
        }),
      });

      const body = (await response.json()) as CreateWorkflowRunResponse;

      if (!response.ok || !body.success || !body.data) {
        setError(body.error?.message ?? "Unable to start this workflow.");
        return;
      }

      router.push(`/workflows/${body.data.workflowRun.id}`);
      router.refresh();
    } catch {
      setError("Unable to start this workflow right now.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <article className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Workflow Template</p>
          <h2 className={compact ? "mt-3 text-xl font-semibold text-foreground" : "mt-3 text-2xl font-semibold text-foreground"}>
            {template.name}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">{template.description}</p>
        </div>
        <div className="status-pill capitalize">{template.defaultPriority}</div>
      </div>

      <p className="mt-4 text-sm leading-6 text-foreground/85">{template.objective}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Required inputs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {template.requiredInputs.map((item) => (
              <span key={item} className="data-chip">
                {formatLabel(item)}
              </span>
            ))}
          </div>
        </div>

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
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="field-label">Step sequence</p>
          <div className="status-pill">{template.steps.length} steps</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.steps.map((step) => (
            <span key={step.id} className="data-chip">
              {step.order}. {step.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <label className="field-label" htmlFor={`${template.id}-brief`}>
          Launch brief
        </label>
        <textarea
          id={`${template.id}-brief`}
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          rows={compact ? 3 : 5}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-orange/30"
          placeholder="Describe the workflow request."
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="field-label" htmlFor={`${template.id}-priority`}>
              Priority
            </label>
            <select
              id={`${template.id}-priority`}
              value={priority}
              onChange={(event) => setPriority(event.target.value as AgentTaskPriority)}
              className="mt-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-foreground outline-none transition focus:border-orange/30"
            >
              {agentTaskPriorities.map((item) => (
                <option key={item} value={item}>
                  {formatLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleStartWorkflow}
            disabled={starting}
            className="inline-flex items-center justify-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting ? "Starting..." : "Start workflow"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </div>
    </article>
  );
}
