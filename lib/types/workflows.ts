import type { AgentTaskPriority, AgentTaskType } from "@/lib/types/agents";
import type { ReviewStatus } from "@/lib/types/team";

export const workflowStatuses = ["draft", "ready", "running", "paused", "needs_review", "completed", "failed"] as const;
export type WorkflowStatus = (typeof workflowStatuses)[number];

export const workflowStepTypes = [
  "agent_task",
  "generation",
  "media_action",
  "campaign_action",
  "promotion_action",
  "review_gate",
  "operator_check",
] as const;
export type WorkflowStepType = (typeof workflowStepTypes)[number];

export const workflowStepStatuses = ["pending", "ready", "running", "paused", "needs_review", "completed", "failed"] as const;
export type WorkflowStepStatus = (typeof workflowStepStatuses)[number];

export interface WorkflowTemplateStep {
  id: string;
  order: number;
  name: string;
  type: WorkflowStepType;
  agentId?: string;
  taskType?: AgentTaskType;
  input?: Record<string, unknown> | null;
  dependsOn: string[];
  nextStepId: string | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  objective: string;
  steps: WorkflowTemplateStep[];
  defaultPriority: AgentTaskPriority;
  requiredInputs: string[];
  expectedOutputs: string[];
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  type: WorkflowStepType;
  agentId?: string;
  taskType?: AgentTaskType;
  status: WorkflowStepStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  dependsOn: string[];
  nextStepId: string | null;
  agentTaskId?: string | null;
  executionPackageId?: string | null;
  error?: string | null;
  activatedAt?: string | null;
  completedAt?: string | null;
}

export interface WorkflowRun {
  id: string;
  teamId?: string | null;
  requestedByUserId?: string | null;
  reviewStatus?: ReviewStatus | null;
  assignedReviewerId?: string | null;
  templateId: string;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  steps: WorkflowStep[];
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  usageSummary?: import("@/lib/types/billing").UsageCheckResult | null;
}

export interface WorkflowProgress {
  runId: string;
  templateId: string;
  status: WorkflowStatus;
  totalSteps: number;
  completedSteps: number;
  needsReviewSteps: number;
  failedSteps: number;
  pendingSteps: number;
  percentComplete: number;
  currentStepId: string | null;
  currentStepName: string | null;
  currentAgentId: string | null;
  currentTaskType: AgentTaskType | null;
  nextAction: string;
}

export interface WorkflowOperationalSummary {
  totalRuns: number;
  activeRuns: number;
  readyRuns: number;
  runningRuns: number;
  stuckRuns: number;
  needsReviewRuns: number;
  completedRuns: number;
  failedRuns: number;
  nextActionRunId: string | null;
  nextAction: string | null;
}
