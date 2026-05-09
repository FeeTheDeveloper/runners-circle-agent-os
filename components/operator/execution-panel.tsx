import { ExecutionTaskBoard } from "@/components/agents/execution-task-board";
import type { AgentTaskRecord } from "@/lib/types/agents";
import type { AgentExecutionPackage, AgentExecutionResult } from "@/lib/types/agent-execution";

interface ExecutionPanelProps {
  tasks: AgentTaskRecord[];
  packages: AgentExecutionPackage[];
  results: AgentExecutionResult[];
}

export function ExecutionPanel({ tasks, packages, results }: ExecutionPanelProps) {
  return (
    <ExecutionTaskBoard
      tasks={tasks}
      initialPackages={packages}
      initialResults={results}
      title="Manual and assisted execution tracking"
      description="Packages, prompt copy, schema previews, and handoff routing live here until a real ChatGPT Agent execution API can be wired in."
      badge="Manual bridge"
      variant="grouped"
    />
  );
}
