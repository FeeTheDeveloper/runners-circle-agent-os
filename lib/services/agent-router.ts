import { agentRegistry } from "@/lib/agents/registry";
import { getAgentTasks } from "@/lib/services/agent-tasks";
import { agentTaskTypes } from "@/lib/types/agents";
import type {
  AgentCoverageMapItem,
  AgentExecutionStep,
  AgentHandoffStep,
  AgentPipelineViewItem,
  AgentRoutingReadinessSummary,
  AgentRoutingResult,
  AgentTaskPriority,
  AgentTaskRecord,
  AgentTaskType,
  RouteTaskToAgentInput,
} from "@/lib/types/agents";

interface RoutingPlaybook {
  defaultPrimaryAgentId: string;
  requiredInputs: string[];
  expectedOutputs: string[];
  executionChain: Array<{
    agentId: string;
    taskType: AgentTaskType;
    reason: string;
  }>;
}

const taskPlaybooks: Record<AgentTaskType, RoutingPlaybook> = {
  generate_image_prompt: {
    defaultPrimaryAgentId: "image-generation-agent",
    requiredInputs: ["creative brief", "subject or product", "aspect ratio", "visual intent"],
    expectedOutputs: ["execution-ready prompt", "visual direction", "review checklist"],
    executionChain: [
      {
        agentId: "creative-systems-builder",
        taskType: "design_creative_system",
        reason: "Translate the request into a reusable visual system before prompt execution.",
      },
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Harden the prompt so the generation lane receives a cleaner instruction set.",
      },
      {
        agentId: "image-generation-agent",
        taskType: "generate_image_prompt",
        reason: "Produce the final image prompt package for execution.",
      },
      {
        agentId: "operator-agent",
        taskType: "review_media",
        reason: "Queue operator-facing review after the prompt packet is assembled.",
      },
    ],
  },
  generate_video_prompt: {
    defaultPrimaryAgentId: "video-generation-agent",
    requiredInputs: ["creative brief", "motion intent", "duration", "delivery format"],
    expectedOutputs: ["render-ready prompt", "shot sequence", "timing notes"],
    executionChain: [
      {
        agentId: "motion-director",
        taskType: "direct_motion_concept",
        reason: "Shape the motion arc and shot logic before prompt packaging.",
      },
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Refine the motion brief into a cleaner execution prompt.",
      },
      {
        agentId: "video-generation-agent",
        taskType: "generate_video_prompt",
        reason: "Prepare the final video-generation prompt packet.",
      },
      {
        agentId: "operator-agent",
        taskType: "review_media",
        reason: "Surface the resulting motion packet for review and next routing.",
      },
    ],
  },
  review_media: {
    defaultPrimaryAgentId: "operator-agent",
    requiredInputs: ["asset id or prompt packet", "quality criteria", "decision deadline"],
    expectedOutputs: ["review decision", "findings", "next handoff recommendation"],
    executionChain: [
      {
        agentId: "operator-agent",
        taskType: "review_media",
        reason: "Centralize the approval decision and downstream routing.",
      },
      {
        agentId: "media-librarian-agent",
        taskType: "catalog_media_library",
        reason: "Ensure approved assets are organized for later retrieval.",
      },
      {
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        reason: "Prepare the next campaign handoff if the media is approved.",
      },
    ],
  },
  build_campaign: {
    defaultPrimaryAgentId: "campaign-builder-agent",
    requiredInputs: ["approved assets", "campaign objective", "target channels", "target audience"],
    expectedOutputs: ["campaign structure", "asset plan", "success metric"],
    executionChain: [
      {
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        reason: "Bring forward prior performance signals before structuring the campaign.",
      },
      {
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        reason: "Own the campaign architecture and rollout plan.",
      },
      {
        agentId: "brand-voice-agent",
        taskType: "create_caption_pack",
        reason: "Calibrate copy and hooks for the resulting campaign structure.",
      },
      {
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        reason: "Package the campaign into downstream promotion deliverables.",
      },
    ],
  },
  prepare_promotion: {
    defaultPrimaryAgentId: "promotion-agent",
    requiredInputs: ["campaign id", "approved media ids", "channels", "call to action"],
    expectedOutputs: ["promotion package", "deliverables", "launch notes"],
    executionChain: [
      {
        agentId: "brand-voice-agent",
        taskType: "create_caption_pack",
        reason: "Prepare copy scaffolding before packaging the promotion bundle.",
      },
      {
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        reason: "Assemble the outbound promotion package.",
      },
      {
        agentId: "operator-agent",
        taskType: "review_media",
        reason: "Hold the package for operator review before release.",
      },
    ],
  },
  create_caption_pack: {
    defaultPrimaryAgentId: "brand-voice-agent",
    requiredInputs: ["brand tone", "channel list", "campaign objective"],
    expectedOutputs: ["caption options", "calls to action", "voice notes"],
    executionChain: [
      {
        agentId: "brand-voice-agent",
        taskType: "create_caption_pack",
        reason: "Lead tone calibration and caption generation.",
      },
      {
        agentId: "campaign-builder-agent",
        taskType: "create_caption_pack",
        reason: "Align copy to the live campaign structure.",
      },
      {
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        reason: "Carry the copy into promotion packaging if needed.",
      },
    ],
  },
  analyze_performance: {
    defaultPrimaryAgentId: "analytics-agent",
    requiredInputs: ["performance window", "channel data", "campaign context"],
    expectedOutputs: ["performance summary", "insights", "recommendations"],
    executionChain: [
      {
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        reason: "Lead the insight readout and performance diagnosis.",
      },
      {
        agentId: "monetization-agent",
        taskType: "design_monetization_plan",
        reason: "Translate insight into offer and revenue recommendations.",
      },
    ],
  },
  audit_repo: {
    defaultPrimaryAgentId: "repo-tech",
    requiredInputs: ["repository scope", "problem statement", "risk concerns"],
    expectedOutputs: ["audit summary", "risk list", "technical recommendations"],
    executionChain: [
      {
        agentId: "repo-tech",
        taskType: "audit_repo",
        reason: "Inspect the repository structure and architecture first.",
      },
      {
        agentId: "github-build-agent",
        taskType: "build_github_delivery",
        reason: "Check how the changes affect build and delivery lanes.",
      },
      {
        agentId: "workflow-architect-agent",
        taskType: "architect_workflow",
        reason: "Recommend any routing or workflow changes surfaced by the audit.",
      },
    ],
  },
  operator_next_move: {
    defaultPrimaryAgentId: "operator-agent",
    requiredInputs: ["current state", "open blockers", "queue health"],
    expectedOutputs: ["next moves", "escalation notes", "routing recommendation"],
    executionChain: [
      {
        agentId: "operator-agent",
        taskType: "operator_next_move",
        reason: "Own the command-center recommendation.",
      },
      {
        agentId: "agent-orchestrator-agent",
        taskType: "orchestrate_agents",
        reason: "Resolve any cross-agent sequencing that the next move requires.",
      },
    ],
  },
  build_github_delivery: {
    defaultPrimaryAgentId: "github-build-agent",
    requiredInputs: ["repo branch", "change scope", "verification targets"],
    expectedOutputs: ["build lane", "verification checklist", "deployment notes"],
    executionChain: [
      {
        agentId: "repo-tech",
        taskType: "implement_repo_change",
        reason: "Finalize technical change scope before the build lane executes.",
      },
      {
        agentId: "github-build-agent",
        taskType: "build_github_delivery",
        reason: "Run the GitHub-centered build and packaging lane.",
      },
      {
        agentId: "deployment-ops-agent",
        taskType: "deploy_release",
        reason: "Carry the successful build into release operations.",
      },
    ],
  },
  design_creative_system: {
    defaultPrimaryAgentId: "creative-systems-builder",
    requiredInputs: ["creative brief", "brand goals", "asset formats"],
    expectedOutputs: ["creative system", "visual principles", "reusable modules"],
    executionChain: [
      {
        agentId: "creative-systems-builder",
        taskType: "design_creative_system",
        reason: "Lead the creative-system definition work.",
      },
      {
        agentId: "brand-voice-agent",
        taskType: "define_brand_voice",
        reason: "Align the system with the language and tone layer.",
      },
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Convert the system into prompt-ready instructions for downstream agents.",
      },
    ],
  },
  direct_motion_concept: {
    defaultPrimaryAgentId: "motion-director",
    requiredInputs: ["concept brief", "duration", "channel format"],
    expectedOutputs: ["motion concept", "story arc", "shot list"],
    executionChain: [
      {
        agentId: "motion-director",
        taskType: "direct_motion_concept",
        reason: "Lead the motion sequence and pacing design.",
      },
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Refine the motion concept into prompt-ready language.",
      },
      {
        agentId: "video-generation-agent",
        taskType: "generate_video_prompt",
        reason: "Package the motion direction for downstream execution.",
      },
    ],
  },
  implement_repo_change: {
    defaultPrimaryAgentId: "repo-tech",
    requiredInputs: ["technical request", "files in scope", "acceptance criteria"],
    expectedOutputs: ["change summary", "files touched", "validation plan"],
    executionChain: [
      {
        agentId: "repo-tech",
        taskType: "implement_repo_change",
        reason: "Own the code-change implementation path.",
      },
      {
        agentId: "github-build-agent",
        taskType: "build_github_delivery",
        reason: "Confirm the change is ready for build and delivery.",
      },
      {
        agentId: "deployment-ops-agent",
        taskType: "deploy_release",
        reason: "Prepare the rollout once the change is verified.",
      },
    ],
  },
  manage_operator_pipeline: {
    defaultPrimaryAgentId: "agent-orchestrator-agent",
    requiredInputs: ["pipeline snapshot", "agent statuses", "queue priorities"],
    expectedOutputs: ["pipeline state", "checkpoints", "handoff actions"],
    executionChain: [
      {
        agentId: "operator-agent",
        taskType: "manage_operator_pipeline",
        reason: "Assess command-center state and current queue pressure.",
      },
      {
        agentId: "workflow-architect-agent",
        taskType: "architect_workflow",
        reason: "Recommend structural workflow improvements where needed.",
      },
      {
        agentId: "agent-orchestrator-agent",
        taskType: "orchestrate_agents",
        reason: "Finalize the cross-agent sequencing plan.",
      },
    ],
  },
  catalog_media_library: {
    defaultPrimaryAgentId: "media-librarian-agent",
    requiredInputs: ["asset ids", "current metadata", "downstream usage plans"],
    expectedOutputs: ["asset grouping", "metadata updates", "retrieval plan"],
    executionChain: [
      {
        agentId: "media-librarian-agent",
        taskType: "catalog_media_library",
        reason: "Lead asset organization and metadata hygiene.",
      },
      {
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        reason: "Highlight which assets deserve retrieval priority.",
      },
      {
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        reason: "Reconnect organized assets to campaign work.",
      },
    ],
  },
  optimize_prompt: {
    defaultPrimaryAgentId: "prompt-optimization-agent",
    requiredInputs: ["source prompt", "desired outcome", "constraints"],
    expectedOutputs: ["optimized prompt", "strategy notes", "guardrails"],
    executionChain: [
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Lead prompt refinement and constraint hardening.",
      },
      {
        agentId: "brand-voice-agent",
        taskType: "define_brand_voice",
        reason: "Confirm the optimized prompt still matches the brand language system.",
      },
    ],
  },
  architect_workflow: {
    defaultPrimaryAgentId: "workflow-architect-agent",
    requiredInputs: ["workflow goal", "systems involved", "handoff risks"],
    expectedOutputs: ["workflow plan", "automation stages", "failure handling"],
    executionChain: [
      {
        agentId: "workflow-architect-agent",
        taskType: "architect_workflow",
        reason: "Lead the workflow design and failure handling model.",
      },
      {
        agentId: "agent-orchestrator-agent",
        taskType: "orchestrate_agents",
        reason: "Verify the workflow can be executed cleanly across the agent roster.",
      },
      {
        agentId: "deployment-ops-agent",
        taskType: "manage_operator_pipeline",
        reason: "Check whether the workflow is release- and operations-ready.",
      },
    ],
  },
  deploy_release: {
    defaultPrimaryAgentId: "deployment-ops-agent",
    requiredInputs: ["release scope", "environment targets", "rollback constraints"],
    expectedOutputs: ["environment plan", "rollout steps", "rollback plan"],
    executionChain: [
      {
        agentId: "github-build-agent",
        taskType: "build_github_delivery",
        reason: "Confirm the build lane is release-ready before rollout.",
      },
      {
        agentId: "deployment-ops-agent",
        taskType: "deploy_release",
        reason: "Lead the rollout and rollback planning.",
      },
      {
        agentId: "operator-agent",
        taskType: "operator_next_move",
        reason: "Keep command-center awareness aligned after release.",
      },
    ],
  },
  design_monetization_plan: {
    defaultPrimaryAgentId: "monetization-agent",
    requiredInputs: ["revenue goal", "audience segment", "current performance"],
    expectedOutputs: ["revenue model", "offers", "experiments"],
    executionChain: [
      {
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        reason: "Anchor the plan in existing performance and demand signals.",
      },
      {
        agentId: "monetization-agent",
        taskType: "design_monetization_plan",
        reason: "Lead the monetization and offer-planning work.",
      },
      {
        agentId: "brand-voice-agent",
        taskType: "define_brand_voice",
        reason: "Align offers and pricing language to the brand system.",
      },
    ],
  },
  orchestrate_agents: {
    defaultPrimaryAgentId: "agent-orchestrator-agent",
    requiredInputs: ["mission goal", "participating agents", "critical dependencies"],
    expectedOutputs: ["primary outcome", "assigned agents", "execution sequence"],
    executionChain: [
      {
        agentId: "agent-orchestrator-agent",
        taskType: "orchestrate_agents",
        reason: "Lead the multi-agent plan and sequencing.",
      },
      {
        agentId: "operator-agent",
        taskType: "manage_operator_pipeline",
        reason: "Keep the command room aligned to the orchestration plan.",
      },
      {
        agentId: "workflow-architect-agent",
        taskType: "architect_workflow",
        reason: "Turn the plan into a repeatable workflow if it becomes recurring work.",
      },
    ],
  },
  define_brand_voice: {
    defaultPrimaryAgentId: "brand-voice-agent",
    requiredInputs: ["brand context", "tone target", "channels"],
    expectedOutputs: ["voice principles", "approved phrases", "sample copy"],
    executionChain: [
      {
        agentId: "brand-voice-agent",
        taskType: "define_brand_voice",
        reason: "Lead the tone and voice system definition.",
      },
      {
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        reason: "Convert the voice rules into prompt guardrails.",
      },
      {
        agentId: "campaign-builder-agent",
        taskType: "create_caption_pack",
        reason: "Put the voice system to work in channel-level messaging.",
      },
    ],
  },
};

const taskKeywordHints: Array<{ taskType: AgentTaskType; keywords: string[] }> = [
  { taskType: "generate_image_prompt", keywords: ["image", "visual", "poster", "thumbnail", "hero"] },
  { taskType: "generate_video_prompt", keywords: ["video", "motion", "reel", "animation", "shot"] },
  { taskType: "review_media", keywords: ["review", "qa", "approve", "feedback", "critique"] },
  { taskType: "build_campaign", keywords: ["campaign", "launch plan", "rollout", "channel plan"] },
  { taskType: "prepare_promotion", keywords: ["promotion", "package", "launch copy", "outbound"] },
  { taskType: "create_caption_pack", keywords: ["caption", "social copy", "hook", "headline"] },
  { taskType: "analyze_performance", keywords: ["analytics", "performance", "ctr", "conversion", "report"] },
  { taskType: "audit_repo", keywords: ["audit", "repo", "architecture", "codebase"] },
  { taskType: "operator_next_move", keywords: ["next move", "triage", "what should we do", "command room"] },
  { taskType: "build_github_delivery", keywords: ["github", "pr", "ci", "build", "merge"] },
  { taskType: "design_creative_system", keywords: ["creative system", "art direction", "visual system"] },
  { taskType: "direct_motion_concept", keywords: ["storyboard", "sequence", "pacing", "motion direction"] },
  { taskType: "implement_repo_change", keywords: ["implement", "refactor", "fix the code", "code change"] },
  { taskType: "manage_operator_pipeline", keywords: ["pipeline", "routing readiness", "queue health"] },
  { taskType: "catalog_media_library", keywords: ["library", "catalog", "metadata", "archive"] },
  { taskType: "optimize_prompt", keywords: ["optimize prompt", "rewrite prompt", "prompt quality"] },
  { taskType: "architect_workflow", keywords: ["workflow", "handoff", "automation", "durable flow"] },
  { taskType: "deploy_release", keywords: ["deploy", "release", "rollout", "rollback"] },
  { taskType: "design_monetization_plan", keywords: ["monetization", "pricing", "offer", "revenue"] },
  { taskType: "orchestrate_agents", keywords: ["orchestrate", "coordinate agents", "multi-agent"] },
  { taskType: "define_brand_voice", keywords: ["brand voice", "tone", "messaging system", "voice"] },
];

const priorityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function formatTaskTypeLabel(taskType: AgentTaskType) {
  return taskType.replaceAll("_", " ");
}

function getAgentStatus(agentId: string) {
  return agentRegistry.find((agent) => agent.id === agentId)?.status ?? "offline";
}

function inferTaskType(request: string, context?: Record<string, unknown>): AgentTaskType {
  const normalizedRequest = request.toLowerCase();
  const scores = new Map<AgentTaskType, number>();

  for (const hint of taskKeywordHints) {
    const score = hint.keywords.reduce((count, keyword) => {
      return normalizedRequest.includes(keyword) ? count + 1 : count;
    }, 0);

    if (score > 0) {
      scores.set(hint.taskType, (scores.get(hint.taskType) ?? 0) + score);
    }
  }

  if (context) {
    if ("aspectRatio" in context || "style" in context) {
      scores.set("generate_image_prompt", (scores.get("generate_image_prompt") ?? 0) + 2);
    }

    if ("duration" in context || "motionStyle" in context || "format" in context) {
      scores.set("generate_video_prompt", (scores.get("generate_video_prompt") ?? 0) + 2);
    }

    if ("campaignId" in context && "channels" in context) {
      scores.set("prepare_promotion", (scores.get("prepare_promotion") ?? 0) + 2);
      scores.set("build_campaign", (scores.get("build_campaign") ?? 0) + 1);
    }

    if ("mediaAssetIds" in context) {
      scores.set("catalog_media_library", (scores.get("catalog_media_library") ?? 0) + 1);
    }
  }

  const bestMatch = [...scores.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return bestMatch ?? "operator_next_move";
}

function withPriorityEscalation(
  chain: RoutingPlaybook["executionChain"],
  priority: AgentTaskPriority,
): RoutingPlaybook["executionChain"] {
  const nextChain = [...chain];

  if (priority === "high" || priority === "urgent") {
    const hasOrchestrator = nextChain.some((step) => step.agentId === "agent-orchestrator-agent");

    if (!hasOrchestrator) {
      nextChain.unshift({
        agentId: "agent-orchestrator-agent",
        taskType: "orchestrate_agents",
        reason: "High-priority work gets orchestration support before the primary lane executes.",
      });
    }
  }

  if (priority === "urgent") {
    const hasOperator = nextChain.some((step) => step.agentId === "operator-agent");

    if (!hasOperator) {
      nextChain.unshift({
        agentId: "operator-agent",
        taskType: "operator_next_move",
        reason: "Urgent work is surfaced to the operator lane for immediate triage.",
      });
    }
  }

  return nextChain;
}

function getExecutionChain(taskType: AgentTaskType, request: string) {
  const playbook = taskPlaybooks[taskType];
  const normalizedRequest = request.toLowerCase();

  if (taskType === "generate_video_prompt" && (normalizedRequest.includes("storyboard") || normalizedRequest.includes("sequence"))) {
    return [
      {
        agentId: "motion-director",
        taskType: "direct_motion_concept" as const,
        reason: "Storyboard-heavy requests start with the Motion Director.",
      },
      ...playbook.executionChain.slice(1),
    ];
  }

  if (
    taskType === "generate_image_prompt" &&
    (normalizedRequest.includes("system") || normalizedRequest.includes("art direction"))
  ) {
    return [
      {
        agentId: "creative-systems-builder",
        taskType: "design_creative_system" as const,
        reason: "System-level visual requests start with the creative system lane.",
      },
      ...playbook.executionChain.slice(1),
    ];
  }

  if (
    taskType === "audit_repo" &&
    (normalizedRequest.includes("ci") || normalizedRequest.includes("build") || normalizedRequest.includes("deploy"))
  ) {
    return [
      {
        agentId: "github-build-agent",
        taskType: "build_github_delivery" as const,
        reason: "Build and CI concerns are checked first in the GitHub delivery lane.",
      },
      {
        agentId: "repo-tech",
        taskType: "audit_repo" as const,
        reason: "Repo Tech follows with architecture-specific review.",
      },
      {
        agentId: "deployment-ops-agent",
        taskType: "deploy_release" as const,
        reason: "Deployment Ops evaluates release risk surfaced by the audit.",
      },
    ];
  }

  return playbook.executionChain;
}

function toExecutionOrder(chain: RoutingPlaybook["executionChain"]): AgentExecutionStep[] {
  return chain.map((step, index) => ({
    order: index + 1,
    agentId: step.agentId,
    taskType: step.taskType,
    reason: step.reason,
  }));
}

function toHandoffPlan(chain: RoutingPlaybook["executionChain"]): AgentHandoffStep[] {
  return chain.slice(0, -1).map((step, index) => {
    const nextStep = chain[index + 1];
    const nextPlaybook = taskPlaybooks[nextStep.taskType];
    const currentPlaybook = taskPlaybooks[step.taskType];

    return {
      fromAgentId: step.agentId,
      toAgentId: nextStep.agentId,
      taskType: nextStep.taskType,
      reason: nextStep.reason,
      requiredInputs: nextPlaybook.requiredInputs.slice(0, 3),
      expectedOutputs: currentPlaybook.expectedOutputs.slice(0, 3),
    };
  });
}

function pickPrimaryAgentId(taskType: AgentTaskType, chain: RoutingPlaybook["executionChain"]) {
  const playbook = taskPlaybooks[taskType];
  const preferredStep = chain.find((step) => step.agentId === playbook.defaultPrimaryAgentId);
  return preferredStep?.agentId ?? chain[0]?.agentId ?? playbook.defaultPrimaryAgentId;
}

function filterReadyAgentIds(agentIds: string[]) {
  return unique(agentIds).filter((agentId) => getAgentStatus(agentId) !== "offline");
}

function buildTaskRequest(task: AgentTaskRecord) {
  if (typeof task.input.prompt === "string" && task.input.prompt.trim().length > 0) {
    return task.input.prompt;
  }

  return `Queued ${formatTaskTypeLabel(task.taskType)} request`;
}

export function routeTaskToAgent(input: RouteTaskToAgentInput): AgentRoutingResult {
  const taskType = input.taskType ?? inferTaskType(input.request, input.context);
  const playbook = taskPlaybooks[taskType];
  const chain = withPriorityEscalation(getExecutionChain(taskType, input.request), input.priority);
  const executionOrder = toExecutionOrder(chain);
  const primaryAgentId = pickPrimaryAgentId(taskType, chain);
  const supportingAgentIds = filterReadyAgentIds(
    chain.map((step) => step.agentId).filter((agentId) => agentId !== primaryAgentId),
  );

  return {
    primaryAgentId,
    supportingAgentIds,
    executionOrder,
    requiredInputs: playbook.requiredInputs,
    expectedOutputs: playbook.expectedOutputs,
    handoffPlan: toHandoffPlan(chain),
  };
}

export function getAgentCoverageMap(): AgentCoverageMapItem[] {
  return agentTaskTypes.map((taskType) => {
    const capableAgents = agentRegistry
      .filter((agent) => agent.acceptedTaskTypes.includes(taskType))
      .sort((left, right) => {
        return (priorityOrder[left.priorityLevel] ?? 99) - (priorityOrder[right.priorityLevel] ?? 99);
      });
    const routing = routeTaskToAgent({
      request: `Coverage map for ${formatTaskTypeLabel(taskType)}`,
      taskType,
      priority: "normal",
    });

    return {
      taskType,
      primaryAgentIds: capableAgents.map((agent) => agent.id),
      supportingAgentIds: routing.supportingAgentIds,
      ready: capableAgents.some((agent) => agent.status !== "offline"),
      availableAgents: capableAgents.filter((agent) => agent.status !== "offline").length,
    };
  });
}

export function getRoutingReadinessSummary(): AgentRoutingReadinessSummary {
  const coverage = getAgentCoverageMap();
  const coveredTaskTypes = coverage.filter((item) => item.ready).length;
  const uncoveredTaskTypes = coverage.filter((item) => !item.ready).map((item) => item.taskType);
  const readyAgents = agentRegistry.filter((agent) => agent.status === "available").length;
  const busyAgents = agentRegistry.filter((agent) => agent.status === "busy").length;
  const offlineAgents = agentRegistry.filter((agent) => agent.status === "offline").length;
  const orchestrationReady = ["agent-orchestrator-agent", "operator-agent", "workflow-architect-agent"].every(
    (agentId) => getAgentStatus(agentId) !== "offline",
  );
  const handoffRoutes = agentTaskTypes.reduce((count, taskType) => {
    return (
      count +
      routeTaskToAgent({
        request: `Readiness pass for ${formatTaskTypeLabel(taskType)}`,
        taskType,
        priority: "normal",
      }).handoffPlan.length
    );
  }, 0);

  return {
    totalTaskTypes: agentTaskTypes.length,
    coveredTaskTypes,
    uncoveredTaskTypes,
    readyAgents,
    busyAgents,
    offlineAgents,
    orchestrationReady,
    handoffRoutes,
  };
}

export function getActivePipelineView(limit = 6): AgentPipelineViewItem[] {
  return getAgentTasks()
    .slice(0, limit)
    .map((task) => {
      const routing = routeTaskToAgent({
        request: buildTaskRequest(task),
        taskType: task.taskType,
        priority: task.priority,
        context: task.input,
      });
      const nextHandoff =
        routing.handoffPlan.find((handoff) => handoff.fromAgentId === task.agentId) ?? routing.handoffPlan[0] ?? null;

      return {
        taskId: task.id,
        taskType: task.taskType,
        priority: task.priority,
        status: task.status,
        primaryAgentId: routing.primaryAgentId,
        supportingAgentIds: routing.supportingAgentIds,
        nextHandoff,
      };
    });
}

export function getAgentName(agentId: string) {
  return agentRegistry.find((agent) => agent.id === agentId)?.name ?? agentId;
}

export function getTaskTypeDisplayName(taskType: AgentTaskType) {
  return formatTaskTypeLabel(taskType);
}
