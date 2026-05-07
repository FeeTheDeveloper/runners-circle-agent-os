import { AppShell } from "@/components/layout/app-shell";
import { AgentCard } from "@/components/agents/agent-card";
import { getAgents } from "@/lib/services/agent-tasks";

export default function AgentsPage() {
  const agents = getAgents();

  return (
    <AppShell
      eyebrow="Agents"
      title="Assign structured work to the existing ChatGPT Agent roster."
      description="This surface is the registry view for the internal command system: each agent has typed capabilities, accepted task types, and a placeholder assign action ready for future dashboard wiring."
    >
      <section className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Assignment Protocol</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">What each task record should capture</h2>
          <div className="mt-6 space-y-3">
            {["agentId", "taskType", "priority", "input payload", "mock queue state"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
