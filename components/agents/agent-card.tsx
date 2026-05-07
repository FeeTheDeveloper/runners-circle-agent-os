import type { AgentRegistryEntry } from "@/lib/types/agents";

interface AgentCardProps {
  agent: AgentRegistryEntry;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <article className="panel interactive-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{agent.role}</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">{agent.name}</h2>
        </div>
        <div className="status-pill">{agent.status}</div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{agent.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {agent.capabilities.map((capability) => (
          <span key={capability} className="data-chip">
            {capability}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Accepted task types</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.acceptedTaskTypes.map((taskType) => (
            <span key={taskType} className="data-chip">
              {taskType}
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
          <p className="field-label">Availability</p>
          <p className="mt-2 text-lg font-semibold text-foreground capitalize">{agent.status}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <p className="field-label">Output schema keys</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(agent.outputSchema).map((schemaKey) => (
            <span key={schemaKey} className="data-chip">
              {schemaKey}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mt-5 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:border-orange/40 hover:text-foreground"
      >
        Assign task placeholder
      </button>
    </article>
  );
}
