export const agentStatuses = ["available", "busy", "offline"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

export const agentPriorityLevels = ["critical", "high", "medium", "low"] as const;
export type AgentPriorityLevel = (typeof agentPriorityLevels)[number];

export const agentTaskTypes = [
  "generate_image_prompt",
  "generate_video_prompt",
  "review_media",
  "build_campaign",
  "prepare_promotion",
  "create_caption_pack",
  "analyze_performance",
  "audit_repo",
  "operator_next_move",
  "build_github_delivery",
  "design_creative_system",
  "direct_motion_concept",
  "implement_repo_change",
  "manage_operator_pipeline",
  "catalog_media_library",
  "optimize_prompt",
  "architect_workflow",
  "deploy_release",
  "design_monetization_plan",
  "orchestrate_agents",
  "define_brand_voice",
] as const;

export type AgentTaskType = (typeof agentTaskTypes)[number];

export const agentTaskStatuses = [
  "queued",
  "assigned",
  "executing",
  "needs_review",
  "completed",
  "failed",
] as const;

export type AgentTaskStatus = (typeof agentTaskStatuses)[number];

export const agentTaskPriorities = ["low", "normal", "high", "urgent"] as const;
export type AgentTaskPriority = (typeof agentTaskPriorities)[number];

export type AgentCapability =
  | "github_builds"
  | "creative_system_design"
  | "motion_direction"
  | "repo_implementation"
  | "operator_coordination"
  | "campaign_strategy"
  | "promotion_packaging"
  | "image_generation"
  | "video_generation"
  | "performance_analysis"
  | "brand_voice"
  | "media_library_management"
  | "prompt_optimization"
  | "workflow_architecture"
  | "deployment_operations"
  | "monetization_strategy"
  | "agent_orchestration"
  | "quality_review"
  | "handoff_planning";

export interface AgentOutputSchemaField {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  itemsType?: "string" | "number" | "boolean" | "object";
  enum?: string[];
}

export interface AgentOutputSchema {
  type: "object";
  description: string;
  required: string[];
  properties: Record<string, AgentOutputSchemaField>;
}

export interface AgentRegistryEntry {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  acceptedTaskTypes: AgentTaskType[];
  outputSchema: Partial<Record<AgentTaskType, AgentOutputSchema>>;
  status: AgentStatus;
  priorityLevel: AgentPriorityLevel;
  handoffTargets: string[];
}

export interface AgentTaskInput {
  [key: string]: unknown;
}

export interface CreateAgentTaskInput {
  agentId: string;
  taskType: AgentTaskType;
  priority?: AgentTaskPriority;
  input: AgentTaskInput;
  userId?: string | null;
  teamId?: string | null;
}

export interface AgentTaskRecord {
  id: string;
  agentId: string;
  agentName: string;
  teamId?: string | null;
  taskType: AgentTaskType;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  input: AgentTaskInput;
  outputSchema: AgentOutputSchema | null;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
  usageSummary?: import("@/lib/types/billing").UsageCheckResult | null;
}

export interface AgentTaskValidationSuccess {
  valid: true;
  agent: AgentRegistryEntry;
  outputSchema: AgentOutputSchema | null;
}

export interface AgentTaskValidationFailure {
  valid: false;
  code: "INVALID_AGENT_TASK";
  message: string;
}

export type AgentTaskValidationResult = AgentTaskValidationSuccess | AgentTaskValidationFailure;

export interface AgentTaskMutationSuccess {
  success: true;
  data: AgentTaskRecord;
}

export interface AgentTaskMutationFailure {
  success: false;
  error: {
    code: "INVALID_AGENT_TASK" | "TASK_NOT_FOUND";
    message: string;
  };
}

export type AgentTaskMutationResult = AgentTaskMutationSuccess | AgentTaskMutationFailure;

export interface AssignAgentApiSuccess {
  success: true;
  data: {
    taskId: string;
    status: AgentTaskStatus;
    assignedAgent: string;
    nextStep: string;
  };
}

export interface AssignAgentApiError {
  success: false;
  error: {
    message: string;
    code: "INVALID_AGENT_TASK" | "INVALID_REQUEST" | "INTERNAL_ERROR";
  };
}

export interface RouteTaskToAgentInput {
  request: string;
  taskType?: AgentTaskType;
  priority: AgentTaskPriority;
  context?: AgentTaskInput;
}

export interface AgentExecutionStep {
  order: number;
  agentId: string;
  taskType: AgentTaskType;
  reason: string;
}

export interface AgentHandoffStep {
  fromAgentId: string;
  toAgentId: string;
  taskType: AgentTaskType;
  reason: string;
  requiredInputs: string[];
  expectedOutputs: string[];
}

export interface AgentRoutingResult {
  primaryAgentId: string;
  supportingAgentIds: string[];
  executionOrder: AgentExecutionStep[];
  requiredInputs: string[];
  expectedOutputs: string[];
  handoffPlan: AgentHandoffStep[];
}

export interface AgentCoverageMapItem {
  taskType: AgentTaskType;
  primaryAgentIds: string[];
  supportingAgentIds: string[];
  ready: boolean;
  availableAgents: number;
}

export interface AgentRoutingReadinessSummary {
  totalTaskTypes: number;
  coveredTaskTypes: number;
  uncoveredTaskTypes: AgentTaskType[];
  readyAgents: number;
  busyAgents: number;
  offlineAgents: number;
  orchestrationReady: boolean;
  handoffRoutes: number;
}

export interface AgentPipelineViewItem {
  taskId: string;
  taskType: AgentTaskType;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  primaryAgentId: string;
  supportingAgentIds: string[];
  nextHandoff: AgentHandoffStep | null;
}
