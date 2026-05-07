export const agentStatuses = ["available", "busy", "offline"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

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
  | "creative_direction"
  | "prompt_strategy"
  | "image_direction"
  | "video_direction"
  | "media_review"
  | "campaign_strategy"
  | "promotion_packaging"
  | "caption_writing"
  | "performance_analysis"
  | "repo_auditing"
  | "operator_guidance";

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
}

export interface AgentTaskInput {
  [key: string]: unknown;
}

export interface CreateAgentTaskInput {
  agentId: string;
  taskType: AgentTaskType;
  priority?: AgentTaskPriority;
  input: AgentTaskInput;
}

export interface AgentTaskRecord {
  id: string;
  agentId: string;
  agentName: string;
  taskType: AgentTaskType;
  priority: AgentTaskPriority;
  status: AgentTaskStatus;
  input: AgentTaskInput;
  outputSchema: AgentOutputSchema | null;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
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
