import { agentRegistry } from "@/lib/agents/registry";
import type {
  AgentRegistryEntry,
  AgentTaskRecord,
  AgentTaskStatus,
  AgentTaskType,
  AgentTaskValidationResult,
  CreateAgentTaskInput,
} from "@/lib/types/agents";

const NEXT_STEP_MESSAGE = "Task queued for agent execution.";

function nowIso() {
  return new Date().toISOString();
}

function createTaskId() {
  return `task_${Math.random().toString(36).slice(2, 10)}`;
}

function buildSeedTask(input: {
  id: string;
  agentId: string;
  taskType: AgentTaskType;
  status: AgentTaskStatus;
  priority: "low" | "normal" | "high" | "urgent";
  input: Record<string, unknown>;
}): AgentTaskRecord {
  const agent = agentRegistry.find((entry) => entry.id === input.agentId);

  if (!agent) {
    throw new Error(`Cannot seed task for unknown agent "${input.agentId}".`);
  }

  const timestamp = nowIso();

  return {
    id: input.id,
    agentId: agent.id,
    agentName: agent.name,
    taskType: input.taskType,
    priority: input.priority,
    status: input.status,
    input: input.input,
    outputSchema: agent.outputSchema[input.taskType] ?? null,
    nextStep: NEXT_STEP_MESSAGE,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const mockAgentTasks: AgentTaskRecord[] = [
  buildSeedTask({
    id: "task_seed_queued",
    agentId: "creative-director",
    taskType: "generate_video_prompt",
    status: "queued",
    priority: "high",
    input: {
      prompt: "Create a launch video concept for Runners Circle Agent OS.",
    },
  }),
  buildSeedTask({
    id: "task_seed_executing",
    agentId: "image-generation",
    taskType: "generate_image_prompt",
    status: "executing",
    priority: "normal",
    input: {
      prompt: "Generate a premium dashboard hero image concept.",
    },
  }),
  buildSeedTask({
    id: "task_seed_review",
    agentId: "operator",
    taskType: "review_media",
    status: "needs_review",
    priority: "high",
    input: {
      assetId: "media-foundation-1",
    },
  }),
  buildSeedTask({
    id: "task_seed_failed",
    agentId: "analytics",
    taskType: "analyze_performance",
    status: "failed",
    priority: "low",
    input: {
      campaignId: "campaign-foundation-1",
    },
  }),
];

export function getAgents(): AgentRegistryEntry[] {
  return agentRegistry;
}

export function getAgentById(agentId: string): AgentRegistryEntry | null {
  return agentRegistry.find((agent) => agent.id === agentId) ?? null;
}

export function validateAgentTask(agentId: string, taskType: AgentTaskType): AgentTaskValidationResult {
  const agent = getAgentById(agentId);

  if (!agent || agent.status === "offline" || !agent.acceptedTaskTypes.includes(taskType)) {
    return {
      valid: false,
      code: "INVALID_AGENT_TASK",
      message: "Invalid agent or unsupported task type.",
    };
  }

  return {
    valid: true,
    agent,
    outputSchema: agent.outputSchema[taskType] ?? null,
  };
}

export function createAgentTask(input: CreateAgentTaskInput) {
  const validation = validateAgentTask(input.agentId, input.taskType);

  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: validation.code,
        message: validation.message,
      },
    } as const;
  }

  const timestamp = nowIso();
  const task: AgentTaskRecord = {
    id: createTaskId(),
    agentId: validation.agent.id,
    agentName: validation.agent.name,
    taskType: input.taskType,
    priority: input.priority ?? "normal",
    status: "queued",
    input: input.input,
    outputSchema: validation.outputSchema,
    nextStep: NEXT_STEP_MESSAGE,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  mockAgentTasks.unshift(task);

  // TODO: Persist task records to Supabase once the backend persistence layer is ready.
  // TODO: Trigger live ChatGPT Agent execution after the external execution bridge is implemented.

  return {
    success: true,
    data: task,
  } as const;
}

export function getAgentTasks(): AgentTaskRecord[] {
  return [...mockAgentTasks];
}

export function getAgentTaskById(taskId: string): AgentTaskRecord | null {
  return mockAgentTasks.find((task) => task.id === taskId) ?? null;
}

export function updateAgentTaskStatus(taskId: string, status: AgentTaskStatus): AgentTaskRecord | null {
  const task = mockAgentTasks.find((entry) => entry.id === taskId);

  if (!task) {
    return null;
  }

  task.status = status;
  task.updatedAt = nowIso();

  // TODO: Sync task status changes to Supabase when persistence is enabled.
  // TODO: Wire status changes to live ChatGPT Agent execution updates once available.

  return task;
}
