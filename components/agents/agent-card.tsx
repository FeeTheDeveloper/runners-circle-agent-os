import { agentRegistry } from "@/lib/agents/registry";
import type { AgentRegistryEntry } from "@/lib/types/agents";

interface AgentCardProps {
  agent: AgentRegistryEntry;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function AgentCard({ agent }: AgentCardProps) {
  const handoffTargets = agent.handoffTargets.map(
    (targetId) => agentRegistry.find((entry) => entry.id === targetId)?.name ?? targetId,
  );

  return (
    <article className="panel interactive-border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{agent.role}</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{agent.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="status-pill capitalize">{agent.status}</div>
          <div className="status-pill border-electric/20 bg-electric/10 text-electric capitalize">
            {agent.priorityLevel} priority
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{agent.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {agent.capabilities.map((capability) => (
          <span key={capability} className="data-chip">
            {formatLabel(capability)}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Accepted task types</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.acceptedTaskTypes.map((taskType) => (
            <span key={taskType} className="data-chip">
              {formatLabel(taskType)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Handoff targets</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {handoffTargets.map((target) => (
            <span key={target} className="data-chip">
              {target}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Output contracts</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{Object.keys(agent.outputSchema).length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="field-label">Direct handoffs</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{agent.handoffTargets.length}</p>
        </div>
      </div>
    </article>
  );
}
