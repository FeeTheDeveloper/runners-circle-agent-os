import { AgentCard } from "@/components/agents/agent-card";
import { ExecutionTaskBoard } from "@/components/agents/execution-task-board";
import { AppShell } from "@/components/layout/app-shell";
import { getAgentOperationsSummary } from "@/lib/agents/registry";
import { getExecutionPackages, getExecutionResults } from "@/lib/services/agent-execution";
import { getAgentCoverageMap, getRoutingReadinessSummary, getTaskTypeDisplayName } from "@/lib/services/agent-router";
import { getAgents, getAgentTasks } from "@/lib/services/agent-tasks";

export default function AgentsPage() {
  const agents = getAgents();
  const tasks = getAgentTasks();
  const executionPackages = getExecutionPackages();
  const executionResults = executionPackages.flatMap((executionPackage) => getExecutionResults(executionPackage.id));
  const summary = getAgentOperationsSummary();
  const readiness = getRoutingReadinessSummary();
  const coverage = getAgentCoverageMap().slice(0, 6);

  return (
    <AppShell
      eyebrow="Agent Registry"
      title="Full ChatGPT Agent roster, synced into the internal registry."
      description="This registry reflects the final created ChatGPT Agents, including routing priority, accepted task contracts, and the handoff graph used by the operator layer."
    >
      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Registry Health</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Coverage and routing readiness</h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Registered agents</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.totalAgents}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Supported task types</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{summary.taskCoverage}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Ready agents</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {readiness.readyAgents} available / {readiness.busyAgents} busy
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Handoff routes</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{readiness.handoffRoutes}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">Routing orchestration</p>
              <div
                className={
                  readiness.orchestrationReady
                    ? "status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "status-pill border-warning/30 bg-warning/10 text-warning"
                }
              >
                {readiness.orchestrationReady ? "ready" : "attention needed"}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {readiness.uncoveredTaskTypes.length === 0
                ? "Every registered task contract has at least one routing-ready agent lane."
                : `Uncovered task types: ${readiness.uncoveredTaskTypes.map(getTaskTypeDisplayName).join(", ")}.`}
            </p>
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Coverage Map</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Primary coverage across the routing layer</h2>

          <div className="mt-6 space-y-3">
            {coverage.map((item) => (
              <div key={item.taskType} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{getTaskTypeDisplayName(item.taskType)}</p>
                    <p className="mt-1 text-sm text-muted">{item.availableAgents} capable agents in the registry</p>
                  </div>
                  <div className="status-pill">{item.ready ? "ready" : "offline"}</div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5">
        <ExecutionTaskBoard
          tasks={tasks}
          initialPackages={executionPackages}
          initialResults={executionResults}
          title="Create execution-ready handoff packages"
          description="Each task can be packaged into a manual or assisted ChatGPT Agent prompt contract. The copy button is meant for human paste into the matching ChatGPT Agent until a supported live execution integration exists."
          badge="Contract layer"
        />
      </section>

      <section className="mt-5 grid gap-5">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </section>
    </AppShell>
  );
}
