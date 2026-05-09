"use client";

import { useState } from "react";
import { agentRegistry } from "@/lib/agents/registry";
import { agentExecutionStatuses } from "@/lib/types/agent-execution";
import type { AgentTaskRecord } from "@/lib/types/agents";
import type { AgentExecutionPackage, AgentExecutionResult } from "@/lib/types/agent-execution";

interface ExecutionTaskBoardProps {
  tasks: AgentTaskRecord[];
  initialPackages: AgentExecutionPackage[];
  initialResults?: AgentExecutionResult[];
  title: string;
  description: string;
  badge?: string;
  variant?: "flat" | "grouped";
}

interface CreateExecutionPackageResponse {
  success: boolean;
  data?: {
    executionPackage: AgentExecutionPackage;
  };
  error?: {
    message: string;
  };
}

interface RecordExecutionResultResponse {
  success: boolean;
  data?: {
    executionResult: AgentExecutionResult;
  };
  error?: {
    message: string;
  };
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusTone(status: string) {
  if (status === "failed") {
    return "status-pill border-danger/30 bg-danger/10 text-danger";
  }

  if (status === "completed") {
    return "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "needs_review") {
    return "status-pill border-warning/30 bg-warning/10 text-warning";
  }

  if (status === "in_progress" || status === "dispatched") {
    return "status-pill border-electric/20 bg-electric/10 text-electric";
  }

  return "status-pill";
}

function mergePackage(
  packages: AgentExecutionPackage[],
  nextPackage: AgentExecutionPackage,
): AgentExecutionPackage[] {
  return [nextPackage, ...packages.filter((executionPackage) => executionPackage.id !== nextPackage.id)];
}

function getLatestPackagesByTaskId(packages: AgentExecutionPackage[]) {
  return packages.reduce<Record<string, AgentExecutionPackage>>((accumulator, executionPackage) => {
    if (!accumulator[executionPackage.taskId]) {
      accumulator[executionPackage.taskId] = executionPackage;
    }

    return accumulator;
  }, {});
}

function getLatestResultsByPackageId(results: AgentExecutionResult[]) {
  return results.reduce<Record<string, AgentExecutionResult>>((accumulator, result) => {
    if (!accumulator[result.packageId]) {
      accumulator[result.packageId] = result;
    }

    return accumulator;
  }, {});
}

export function ExecutionTaskBoard({
  tasks,
  initialPackages,
  initialResults = [],
  title,
  description,
  badge = "Execution bridge",
  variant = "flat",
}: ExecutionTaskBoardProps) {
  const [packages, setPackages] = useState(initialPackages);
  const [results, setResults] = useState(initialResults);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [trackingPackageId, setTrackingPackageId] = useState<string | null>(null);
  const [copiedPackageId, setCopiedPackageId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const latestPackagesByTaskId = getLatestPackagesByTaskId(packages);
  const latestPackages = Object.values(latestPackagesByTaskId);
  const latestResultsByPackageId = getLatestResultsByPackageId(results);
  const unpackagedTasks = tasks.filter((task) => !latestPackagesByTaskId[task.id]);
  const groupedPackages = agentExecutionStatuses.map((status) => ({
    status,
    items: latestPackages.filter((executionPackage) => executionPackage.status === status),
  }));

  async function handleCreateExecutionPackage(taskId: string) {
    setLoadingTaskId(taskId);
    setFeedback((current) => ({ ...current, [taskId]: "" }));

    try {
      const response = await fetch("/api/agents/execution-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      const body = (await response.json()) as CreateExecutionPackageResponse;

      if (!response.ok || !body.success || !body.data) {
        setFeedback((current) => ({
          ...current,
          [taskId]: body.error?.message ?? "Unable to create execution package.",
        }));
        return;
      }

      setPackages((current) => mergePackage(current, body.data!.executionPackage));
      setFeedback((current) => ({
        ...current,
        [taskId]: `Execution package ${body.data!.executionPackage.id} is ${formatLabel(body.data!.executionPackage.status)}.`,
      }));
    } catch {
      setFeedback((current) => ({
        ...current,
        [taskId]: "Unable to create execution package right now.",
      }));
    } finally {
      setLoadingTaskId(null);
    }
  }

  async function handleCopyPrompt(executionPackage: AgentExecutionPackage) {
    try {
      await navigator.clipboard.writeText(executionPackage.instructionPrompt);
      setCopiedPackageId(executionPackage.id);
      setTimeout(() => {
        setCopiedPackageId((current) => (current === executionPackage.id ? null : current));
      }, 1600);
    } catch {
      setFeedback((current) => ({
        ...current,
        [executionPackage.taskId]: "Clipboard access was unavailable for this prompt copy action.",
      }));
    }
  }

  async function handleTrackStatus(task: AgentTaskRecord, executionPackage: AgentExecutionPackage, status: AgentExecutionPackage["status"]) {
    setTrackingPackageId(executionPackage.id);
    setFeedback((current) => ({ ...current, [task.id]: "" }));

    try {
      const response = await fetch("/api/agents/execution-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: executionPackage.id,
          status,
          output: null,
          reviewNotes: `Manual bridge status updated to ${formatLabel(status)} for ${task.agentName}.`,
          nextRecommendedAgentId:
            status === "needs_review" ? executionPackage.handoffTargets[0] ?? null : null,
        }),
      });

      const body = (await response.json()) as RecordExecutionResultResponse;

      if (!response.ok || !body.success || !body.data) {
        setFeedback((current) => ({
          ...current,
          [task.id]: body.error?.message ?? "Unable to update execution status.",
        }));
        return;
      }

      setPackages((current) =>
        current.map((entry) =>
          entry.id === executionPackage.id
            ? {
                ...entry,
                status,
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      );
      setResults((current) => [body.data!.executionResult, ...current]);
      setFeedback((current) => ({
        ...current,
        [task.id]: `Execution package moved to ${formatLabel(status)}.`,
      }));
    } catch {
      setFeedback((current) => ({
        ...current,
        [task.id]: "Unable to update execution tracking right now.",
      }));
    } finally {
      setTrackingPackageId(null);
    }
  }

  function getNextManualStatuses(status: AgentExecutionPackage["status"]) {
    if (status === "packaged") {
      return ["dispatched", "failed"] as const;
    }

    if (status === "dispatched") {
      return ["in_progress", "failed"] as const;
    }

    if (status === "in_progress") {
      return ["needs_review", "failed"] as const;
    }

    if (status === "needs_review") {
      return ["completed", "failed"] as const;
    }

    return [] as const;
  }

  function renderTaskCard(task: AgentTaskRecord) {
    const latestPackage = latestPackagesByTaskId[task.id] ?? null;
    const latestResult = latestPackage ? latestResultsByPackageId[latestPackage.id] ?? null : null;
    const schema = latestPackage?.expectedOutputSchema ?? task.outputSchema ?? null;
    const registeredHandoffs =
      latestPackage?.handoffTargets ??
      agentRegistry.find((agent) => agent.id === task.agentId)?.handoffTargets ??
      [];
    const handoffTargets = registeredHandoffs.map(
      (targetId) => agentRegistry.find((entry) => entry.id === targetId)?.name ?? targetId,
    );

    return (
      <article key={task.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">{formatLabel(task.taskType)}</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{task.agentName}</h3>
            <p className="mt-2 text-sm text-muted">
              Task {task.id} | {formatLabel(task.priority)} priority
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className={getStatusTone(latestPackage?.status ?? "draft")}>
              {latestPackage ? formatLabel(latestPackage.status) : "not packaged"}
            </div>
            <div className="status-pill capitalize">{task.status}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCreateExecutionPackage(task.id)}
            disabled={loadingTaskId === task.id}
            className="inline-flex items-center justify-center rounded-full bg-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingTaskId === task.id ? "Packaging..." : latestPackage ? "Refresh package" : "Create execution package"}
          </button>
          <button
            type="button"
            onClick={() => (latestPackage ? handleCopyPrompt(latestPackage) : null)}
            disabled={!latestPackage}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:border-electric/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copiedPackageId === latestPackage?.id ? "Prompt copied" : "Copy prompt"}
          </button>
          {variant === "grouped" && latestPackage
            ? getNextManualStatuses(latestPackage.status).map((nextStatus) => (
                <button
                  key={`${latestPackage.id}-${nextStatus}`}
                  type="button"
                  onClick={() => handleTrackStatus(task, latestPackage, nextStatus)}
                  disabled={trackingPackageId === latestPackage.id}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:border-orange/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {trackingPackageId === latestPackage.id ? "Updating..." : `Mark ${formatLabel(nextStatus)}`}
                </button>
              ))
            : null}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Expected output schema preview</p>
            {schema ? (
              <div className="mt-3">
                <p className="text-sm text-muted">Required: {schema.required.join(", ")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.keys(schema.properties).map((schemaKey) => (
                    <span key={schemaKey} className="data-chip">
                      {schemaKey}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No structured output schema is registered for this task yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Handoff targets</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {handoffTargets.length > 0 ? (
                handoffTargets.map((target) => (
                  <span key={target} className="data-chip">
                    {target}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted">No handoff targets registered.</p>
              )}
            </div>
          </div>
        </div>

        {latestPackage ? (
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="field-label">Execution prompt package</p>
              <p className="text-xs text-muted">{formatTimestamp(latestPackage.updatedAt)}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Mode: {formatLabel(latestPackage.executionMode)}. This prompt is meant to be pasted into the matching ChatGPT Agent manually until a real API bridge exists.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-black/25 p-4 text-xs leading-6 text-foreground/80 whitespace-pre-wrap">
              {latestPackage.instructionPrompt}
            </pre>
          </div>
        ) : null}

        {latestResult ? (
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="field-label">Latest tracked result</p>
            <p className="mt-3 text-sm text-muted">{latestResult.reviewNotes || "No review notes recorded yet."}</p>
            {latestResult.nextRecommendedAgentId ? (
              <p className="mt-2 text-sm text-foreground/80">
                Next recommended agent:{" "}
                {agentRegistry.find((entry) => entry.id === latestResult.nextRecommendedAgentId)?.name ??
                  latestResult.nextRecommendedAgentId}
              </p>
            ) : null}
          </div>
        ) : null}

        {feedback[task.id] ? (
          <div className="mt-4 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground">
            {feedback[task.id]}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Execution Bridge</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="status-pill">{badge}</div>
      </div>

      {variant === "flat" ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => renderTaskCard(task))}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="field-label">Unpackaged tasks</p>
                <p className="mt-2 text-sm text-muted">Tasks waiting for a manual or assisted ChatGPT Agent package.</p>
              </div>
              <div className="status-pill">{unpackagedTasks.length}</div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {unpackagedTasks.length > 0 ? (
                unpackagedTasks.map((task) => renderTaskCard(task))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
                  <p className="text-sm text-muted">Every current task already has an execution package in this session.</p>
                </div>
              )}
            </div>
          </div>

          {groupedPackages.map((group) => (
            <div key={group.status} className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="field-label capitalize">{formatLabel(group.status)} tasks</p>
                  <p className="mt-2 text-sm text-muted">
                    Execution packages currently tracked as {formatLabel(group.status)}.
                  </p>
                </div>
                <div className={getStatusTone(group.status)}>{group.items.length}</div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {group.items.length > 0 ? (
                  group.items.map((executionPackage) => {
                    const task = tasks.find((entry) => entry.id === executionPackage.taskId);

                    return task ? renderTaskCard(task) : null;
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/15 px-4 py-5">
                    <p className="text-sm text-muted">No packages are currently tracked in this state.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
