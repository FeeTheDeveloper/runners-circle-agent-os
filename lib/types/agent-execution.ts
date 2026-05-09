import type { AgentOutputSchema, AgentTaskInput, AgentTaskPriority, AgentTaskType } from "@/lib/types/agents";
import type { ReviewStatus } from "@/lib/types/team";

export const agentExecutionModes = ["manual", "assisted", "api_ready", "automated_future"] as const;
export type AgentExecutionMode = (typeof agentExecutionModes)[number];

export const agentExecutionStatuses = [
  "draft",
  "packaged",
  "dispatched",
  "in_progress",
  "needs_review",
  "completed",
  "failed",
] as const;
export type AgentExecutionStatus = (typeof agentExecutionStatuses)[number];

export interface AgentExecutionPackage {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  teamId?: string | null;
  executionMode: AgentExecutionMode;
  status: AgentExecutionStatus;
  reviewStatus?: ReviewStatus | null;
  assignedReviewerId?: string | null;
  taskType: AgentTaskType;
  priority: AgentTaskPriority;
  instructionPrompt: string;
  contextPayload: AgentTaskInput;
  expectedOutputSchema: AgentOutputSchema | null;
  handoffTargets: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecutionResult {
  id: string;
  packageId: string;
  status: AgentExecutionStatus;
  output: Record<string, unknown> | null;
  reviewNotes: string;
  nextRecommendedAgentId: string | null;
  createdAt: string;
}

export interface RecordExecutionResultInput {
  packageId: string;
  status: AgentExecutionStatus;
  output: Record<string, unknown> | null;
  reviewNotes: string;
  nextRecommendedAgentId?: string | null;
}
