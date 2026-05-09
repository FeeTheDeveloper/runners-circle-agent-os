import type { AgentOutputSchema, AgentRegistryEntry, AgentTaskType } from "@/lib/types/agents";

function createOutputSchema(
  description: string,
  required: string[],
  properties: AgentOutputSchema["properties"],
): AgentOutputSchema {
  return {
    type: "object",
    description,
    required,
    properties,
  };
}

function taskSchemas(taskTypes: AgentTaskType[], schema: AgentOutputSchema) {
  return Object.fromEntries(taskTypes.map((taskType) => [taskType, schema])) as Partial<
    Record<AgentTaskType, AgentOutputSchema>
  >;
}

const imagePromptSchema = createOutputSchema(
  "Structured image prompt contract for downstream ChatGPT Agent execution.",
  ["prompt", "visualDirection", "aspectRatio"],
  {
    prompt: { type: "string", description: "Final image prompt to send to the execution agent." },
    visualDirection: { type: "string", description: "Creative direction for framing, lighting, and tone." },
    aspectRatio: { type: "string", description: "Requested image aspect ratio." },
    reviewChecklist: { type: "array", description: "Quality checks before approval.", itemsType: "string" },
  },
);

const videoPromptSchema = createOutputSchema(
  "Structured video prompt contract for downstream ChatGPT Agent execution.",
  ["prompt", "concept", "durationSeconds"],
  {
    prompt: { type: "string", description: "Final video prompt to send to the execution agent." },
    concept: { type: "string", description: "Core motion concept and narrative direction." },
    durationSeconds: { type: "number", description: "Target duration in seconds." },
    shotList: { type: "array", description: "Ordered list of shots or beats.", itemsType: "string" },
  },
);

const reviewSchema = createOutputSchema(
  "Media review contract used before campaign packaging or release approval.",
  ["decision", "summary"],
  {
    decision: { type: "string", description: "Approve, revise, or reject.", enum: ["approve", "revise", "reject"] },
    summary: { type: "string", description: "Top-level review summary." },
    findings: { type: "array", description: "Specific review observations.", itemsType: "string" },
    nextHandoff: { type: "string", description: "Recommended next downstream handoff." },
  },
);

const campaignSchema = createOutputSchema(
  "Campaign build contract based on approved assets and launch intent.",
  ["campaignTitle", "objective", "channels"],
  {
    campaignTitle: { type: "string", description: "Final campaign name." },
    objective: { type: "string", description: "Campaign objective." },
    channels: { type: "array", description: "Target distribution channels.", itemsType: "string" },
    assetPlan: { type: "array", description: "How assets should be used in the campaign.", itemsType: "string" },
    successMetric: { type: "string", description: "Primary metric the campaign should optimize for." },
  },
);

const promotionSchema = createOutputSchema(
  "Promotion preparation contract for outbound launch and rollout packaging.",
  ["packageTitle", "channels", "deliverables"],
  {
    packageTitle: { type: "string", description: "Promotion package title." },
    channels: { type: "array", description: "Target promotion channels.", itemsType: "string" },
    deliverables: { type: "array", description: "Required promotion outputs.", itemsType: "string" },
    launchNotes: { type: "string", description: "Operator-facing notes for launch readiness." },
  },
);

const captionPackSchema = createOutputSchema(
  "Caption pack contract for channel-specific copy development.",
  ["captions", "callToActions"],
  {
    captions: { type: "array", description: "Draft caption options.", itemsType: "string" },
    callToActions: { type: "array", description: "Suggested CTAs.", itemsType: "string" },
    voiceNotes: { type: "array", description: "Voice calibration notes.", itemsType: "string" },
  },
);

const analyticsSchema = createOutputSchema(
  "Performance analysis contract for campaign and offer insight work.",
  ["summary", "insights", "recommendations"],
  {
    summary: { type: "string", description: "Performance summary." },
    insights: { type: "array", description: "Observed performance insights.", itemsType: "string" },
    recommendations: { type: "array", description: "Recommended next actions.", itemsType: "string" },
    revenueSignals: { type: "array", description: "Monetization or conversion signals.", itemsType: "string" },
  },
);

const repoAuditSchema = createOutputSchema(
  "Repository audit contract for platform and codebase review.",
  ["summary", "risks", "recommendations"],
  {
    summary: { type: "string", description: "Audit summary." },
    risks: { type: "array", description: "Risks found in the repository.", itemsType: "string" },
    recommendations: { type: "array", description: "Suggested follow-up actions.", itemsType: "string" },
    affectedAreas: { type: "array", description: "Files or systems that need attention.", itemsType: "string" },
  },
);

const operatorSchema = createOutputSchema(
  "Operator guidance contract for the next recommended move.",
  ["currentState", "nextMoves"],
  {
    currentState: { type: "string", description: "Current operator state assessment." },
    nextMoves: { type: "array", description: "Recommended next moves.", itemsType: "string" },
    escalationNotes: { type: "array", description: "Escalation or follow-up notes.", itemsType: "string" },
    routingRecommendation: { type: "string", description: "Suggested agent routing outcome." },
  },
);

const githubBuildSchema = createOutputSchema(
  "Build and release contract for GitHub-centered implementation work.",
  ["branchName", "deliverables", "verificationChecklist"],
  {
    branchName: { type: "string", description: "Branch or release lane to target." },
    deliverables: { type: "array", description: "Artifacts or changes to complete.", itemsType: "string" },
    verificationChecklist: { type: "array", description: "Checks that must pass.", itemsType: "string" },
    deploymentNotes: { type: "string", description: "Notes for release or PR handoff." },
  },
);

const creativeSystemSchema = createOutputSchema(
  "Creative system contract for reusable visual language and concept structures.",
  ["systemName", "visualPrinciples", "reusableModules"],
  {
    systemName: { type: "string", description: "Working name for the system." },
    visualPrinciples: { type: "array", description: "Key visual rules and guardrails.", itemsType: "string" },
    reusableModules: { type: "array", description: "Patterns or modules to reuse.", itemsType: "string" },
    approvalPath: { type: "array", description: "Recommended approval sequence.", itemsType: "string" },
  },
);

const motionDirectionSchema = createOutputSchema(
  "Motion direction contract for narrative beats, shot design, and pacing.",
  ["concept", "storyArc", "shotList"],
  {
    concept: { type: "string", description: "Motion concept summary." },
    storyArc: { type: "array", description: "Narrative progression across the piece.", itemsType: "string" },
    shotList: { type: "array", description: "Ordered shots or visual beats.", itemsType: "string" },
    timingNotes: { type: "array", description: "Notes about transitions and pacing.", itemsType: "string" },
  },
);

const repoImplementationSchema = createOutputSchema(
  "Repository implementation contract for concrete code changes.",
  ["changeSummary", "filesTouched", "validationPlan"],
  {
    changeSummary: { type: "string", description: "Summary of the technical change." },
    filesTouched: { type: "array", description: "Files or modules expected to change.", itemsType: "string" },
    validationPlan: { type: "array", description: "Tests or checks to run.", itemsType: "string" },
    followUps: { type: "array", description: "Known follow-ups after the change lands.", itemsType: "string" },
  },
);

const pipelineSchema = createOutputSchema(
  "Pipeline management contract for routing, readiness, and command-center coordination.",
  ["pipelineState", "checkpoints", "handoffActions"],
  {
    pipelineState: { type: "string", description: "High-level summary of pipeline health." },
    checkpoints: { type: "array", description: "Critical execution checkpoints.", itemsType: "string" },
    blockers: { type: "array", description: "Known blockers or risks.", itemsType: "string" },
    handoffActions: { type: "array", description: "Immediate handoff actions to execute.", itemsType: "string" },
  },
);

const mediaLibrarySchema = createOutputSchema(
  "Media library contract for organization, retrieval, and archive hygiene.",
  ["assetGrouping", "metadataUpdates", "retrievalPlan"],
  {
    assetGrouping: { type: "array", description: "Recommended asset groupings or collections.", itemsType: "string" },
    metadataUpdates: { type: "array", description: "Metadata fields to normalize or update.", itemsType: "string" },
    retrievalPlan: { type: "array", description: "How the assets should be surfaced downstream.", itemsType: "string" },
    archiveActions: { type: "array", description: "Archive or retention recommendations.", itemsType: "string" },
  },
);

const promptOptimizationSchema = createOutputSchema(
  "Prompt optimization contract for prompt hardening and prompt-system improvement.",
  ["optimizedPrompt", "strategyNotes", "guardrails"],
  {
    optimizedPrompt: { type: "string", description: "Refined prompt ready for execution." },
    strategyNotes: { type: "array", description: "Why the prompt was changed.", itemsType: "string" },
    guardrails: { type: "array", description: "Constraints to preserve output quality.", itemsType: "string" },
    testVariants: { type: "array", description: "Optional prompt variants to compare.", itemsType: "string" },
  },
);

const workflowSchema = createOutputSchema(
  "Workflow architecture contract for durable orchestration and automation design.",
  ["workflowName", "stages", "automations"],
  {
    workflowName: { type: "string", description: "Name of the workflow or pipeline." },
    stages: { type: "array", description: "Ordered workflow stages.", itemsType: "string" },
    automations: { type: "array", description: "Automations or triggers to add.", itemsType: "string" },
    failureHandling: { type: "array", description: "Retry, rollback, or recovery notes.", itemsType: "string" },
  },
);

const deploymentSchema = createOutputSchema(
  "Deployment operations contract for release execution and rollback planning.",
  ["environmentPlan", "rolloutSteps", "rollbackPlan"],
  {
    environmentPlan: { type: "array", description: "Environments involved in the release.", itemsType: "string" },
    rolloutSteps: { type: "array", description: "Ordered release steps.", itemsType: "string" },
    rollbackPlan: { type: "array", description: "Rollback path if release quality drops.", itemsType: "string" },
    verificationSignals: { type: "array", description: "Signals to watch after release.", itemsType: "string" },
  },
);

const monetizationSchema = createOutputSchema(
  "Monetization planning contract for offers, pricing, and conversion strategy.",
  ["revenueModel", "offers", "experiments"],
  {
    revenueModel: { type: "string", description: "Primary monetization model under review." },
    offers: { type: "array", description: "Offer concepts or pricing bundles.", itemsType: "string" },
    pricingSignals: { type: "array", description: "Signals that inform pricing decisions.", itemsType: "string" },
    experiments: { type: "array", description: "Monetization experiments to run next.", itemsType: "string" },
  },
);

const orchestrationSchema = createOutputSchema(
  "Orchestration contract for multi-agent sequencing and shared ownership.",
  ["primaryOutcome", "assignedAgents", "executionSequence"],
  {
    primaryOutcome: { type: "string", description: "The main outcome the orchestration should achieve." },
    assignedAgents: { type: "array", description: "Agents participating in the flow.", itemsType: "string" },
    executionSequence: { type: "array", description: "Ordered sequence of agent actions.", itemsType: "string" },
    riskFlags: { type: "array", description: "Coordination risks or dependencies to watch.", itemsType: "string" },
  },
);

const brandVoiceSchema = createOutputSchema(
  "Brand voice contract for copy calibration, tone rules, and creative language guardrails.",
  ["voicePrinciples", "doPhrases", "avoidPhrases"],
  {
    voicePrinciples: { type: "array", description: "Core voice principles to preserve.", itemsType: "string" },
    doPhrases: { type: "array", description: "Preferred phrases or patterns.", itemsType: "string" },
    avoidPhrases: { type: "array", description: "Phrases or tones to avoid.", itemsType: "string" },
    sampleCopy: { type: "array", description: "Sample lines in the approved tone.", itemsType: "string" },
  },
);

export const agentRegistry: AgentRegistryEntry[] = [
  {
    id: "github-build-agent",
    name: "GitHub Build Agent",
    role: "Build and release delivery",
    description:
      "Owns GitHub-facing delivery lanes, branch-level build execution, CI awareness, and release-ready packaging for technical work.",
    capabilities: ["github_builds", "deployment_operations", "handoff_planning"],
    acceptedTaskTypes: ["build_github_delivery", "deploy_release"],
    outputSchema: {
      ...taskSchemas(["build_github_delivery"], githubBuildSchema),
      ...taskSchemas(["deploy_release"], deploymentSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["repo-tech", "deployment-ops-agent", "agent-orchestrator-agent"],
  },
  {
    id: "creative-systems-builder",
    name: "Creative Systems Builder",
    role: "Creative system design",
    description:
      "Builds the reusable creative logic behind campaigns, turning broad direction into durable visual systems, concept frames, and approval-ready foundations.",
    capabilities: ["creative_system_design", "quality_review", "handoff_planning"],
    acceptedTaskTypes: ["design_creative_system", "review_media"],
    outputSchema: {
      ...taskSchemas(["design_creative_system"], creativeSystemSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["prompt-optimization-agent", "image-generation-agent", "brand-voice-agent", "motion-director"],
  },
  {
    id: "motion-director",
    name: "Motion Director",
    role: "Motion concept and sequence direction",
    description:
      "Translates ideas into shot-driven motion systems, pacing structures, and sequence-level direction before video generation executes.",
    capabilities: ["motion_direction", "quality_review", "handoff_planning"],
    acceptedTaskTypes: ["direct_motion_concept", "review_media"],
    outputSchema: {
      ...taskSchemas(["direct_motion_concept"], motionDirectionSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "busy",
    priorityLevel: "high",
    handoffTargets: ["video-generation-agent", "prompt-optimization-agent", "campaign-builder-agent"],
  },
  {
    id: "repo-tech",
    name: "Repo Tech",
    role: "Repository implementation and architecture",
    description:
      "Handles repo-level implementation detail, codebase change planning, and technical architecture review across the application surface.",
    capabilities: ["repo_implementation", "github_builds", "handoff_planning"],
    acceptedTaskTypes: ["implement_repo_change", "audit_repo", "build_github_delivery"],
    outputSchema: {
      ...taskSchemas(["implement_repo_change"], repoImplementationSchema),
      ...taskSchemas(["audit_repo"], repoAuditSchema),
      ...taskSchemas(["build_github_delivery"], githubBuildSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["github-build-agent", "deployment-ops-agent", "workflow-architect-agent"],
  },
  {
    id: "operator-agent",
    name: "Operator Agent",
    role: "Command-center coordination",
    description:
      "Keeps the control plane stable by triaging tasks, managing operator readiness, and deciding the next move when multiple pipelines compete for attention.",
    capabilities: ["operator_coordination", "handoff_planning", "quality_review"],
    acceptedTaskTypes: ["operator_next_move", "manage_operator_pipeline", "review_media"],
    outputSchema: {
      ...taskSchemas(["operator_next_move"], operatorSchema),
      ...taskSchemas(["manage_operator_pipeline"], pipelineSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "critical",
    handoffTargets: ["agent-orchestrator-agent", "workflow-architect-agent", "deployment-ops-agent"],
  },
  {
    id: "campaign-builder-agent",
    name: "Campaign Builder Agent",
    role: "Campaign structure and rollout planning",
    description:
      "Packages approved media into campaign architecture, channel plans, and launch sequences that can move directly into promotion prep.",
    capabilities: ["campaign_strategy", "promotion_packaging", "handoff_planning"],
    acceptedTaskTypes: ["build_campaign", "create_caption_pack", "review_media"],
    outputSchema: {
      ...taskSchemas(["build_campaign"], campaignSchema),
      ...taskSchemas(["create_caption_pack"], captionPackSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["brand-voice-agent", "promotion-agent", "analytics-agent", "monetization-agent"],
  },
  {
    id: "promotion-agent",
    name: "Promotion Agent",
    role: "Launch packaging and channel delivery prep",
    description:
      "Turns campaigns into channel-ready launch packages with deliverables, rollout notes, and promotion-specific output structure.",
    capabilities: ["promotion_packaging", "brand_voice", "handoff_planning"],
    acceptedTaskTypes: ["prepare_promotion", "create_caption_pack", "review_media"],
    outputSchema: {
      ...taskSchemas(["prepare_promotion"], promotionSchema),
      ...taskSchemas(["create_caption_pack"], captionPackSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["brand-voice-agent", "media-librarian-agent", "analytics-agent", "operator-agent"],
  },
  {
    id: "image-generation-agent",
    name: "Image Generation Agent",
    role: "Image prompt execution design",
    description:
      "Specializes in execution-ready image prompt packets, preserving composition, quality controls, and delivery-ready image direction.",
    capabilities: ["image_generation", "quality_review", "handoff_planning"],
    acceptedTaskTypes: ["generate_image_prompt", "review_media"],
    outputSchema: {
      ...taskSchemas(["generate_image_prompt"], imagePromptSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["media-librarian-agent", "campaign-builder-agent", "operator-agent"],
  },
  {
    id: "video-generation-agent",
    name: "Video Generation Agent",
    role: "Video prompt execution design",
    description:
      "Owns render-ready video prompt structures, shot fidelity, motion execution detail, and downstream motion delivery packaging.",
    capabilities: ["video_generation", "quality_review", "handoff_planning"],
    acceptedTaskTypes: ["generate_video_prompt", "review_media"],
    outputSchema: {
      ...taskSchemas(["generate_video_prompt"], videoPromptSchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "busy",
    priorityLevel: "high",
    handoffTargets: ["media-librarian-agent", "campaign-builder-agent", "operator-agent"],
  },
  {
    id: "analytics-agent",
    name: "Analytics Agent",
    role: "Performance insight and signal analysis",
    description:
      "Analyzes campaign, content, and monetization performance so the team can route follow-up work using real demand and conversion signals.",
    capabilities: ["performance_analysis", "handoff_planning", "monetization_strategy"],
    acceptedTaskTypes: ["analyze_performance"],
    outputSchema: taskSchemas(["analyze_performance"], analyticsSchema),
    status: "available",
    priorityLevel: "medium",
    handoffTargets: ["campaign-builder-agent", "monetization-agent", "operator-agent"],
  },
  {
    id: "brand-voice-agent",
    name: "Brand Voice Agent",
    role: "Tone system and copy calibration",
    description:
      "Maintains the linguistic system behind captions, hooks, messaging, and launch copy so every downstream output sounds intentional.",
    capabilities: ["brand_voice", "promotion_packaging", "quality_review"],
    acceptedTaskTypes: ["define_brand_voice", "create_caption_pack"],
    outputSchema: {
      ...taskSchemas(["define_brand_voice"], brandVoiceSchema),
      ...taskSchemas(["create_caption_pack"], captionPackSchema),
    },
    status: "available",
    priorityLevel: "medium",
    handoffTargets: ["campaign-builder-agent", "promotion-agent", "prompt-optimization-agent"],
  },
  {
    id: "media-librarian-agent",
    name: "Media Librarian Agent",
    role: "Media organization and retrieval readiness",
    description:
      "Keeps generated assets organized, retrieval-ready, and properly tagged so campaign and promotion lanes can move without losing track of source media.",
    capabilities: ["media_library_management", "quality_review", "handoff_planning"],
    acceptedTaskTypes: ["catalog_media_library", "review_media"],
    outputSchema: {
      ...taskSchemas(["catalog_media_library"], mediaLibrarySchema),
      ...taskSchemas(["review_media"], reviewSchema),
    },
    status: "available",
    priorityLevel: "medium",
    handoffTargets: ["campaign-builder-agent", "promotion-agent", "analytics-agent"],
  },
  {
    id: "prompt-optimization-agent",
    name: "Prompt Optimization Agent",
    role: "Prompt hardening and variant design",
    description:
      "Optimizes prompts before execution so image, video, brand, and campaign agents can work from clearer and more reliable upstream instructions.",
    capabilities: ["prompt_optimization", "image_generation", "video_generation"],
    acceptedTaskTypes: ["optimize_prompt"],
    outputSchema: {
      ...taskSchemas(["optimize_prompt"], promptOptimizationSchema),
    },
    status: "available",
    priorityLevel: "medium",
    handoffTargets: ["image-generation-agent", "video-generation-agent", "brand-voice-agent", "creative-systems-builder"],
  },
  {
    id: "workflow-architect-agent",
    name: "Workflow Architect Agent",
    role: "Workflow and orchestration design",
    description:
      "Designs the handoff logic, workflow stages, and automation checkpoints that turn isolated agents into a dependable operating system.",
    capabilities: ["workflow_architecture", "agent_orchestration", "handoff_planning"],
    acceptedTaskTypes: ["architect_workflow", "manage_operator_pipeline", "orchestrate_agents"],
    outputSchema: {
      ...taskSchemas(["architect_workflow"], workflowSchema),
      ...taskSchemas(["manage_operator_pipeline"], pipelineSchema),
      ...taskSchemas(["orchestrate_agents"], orchestrationSchema),
    },
    status: "available",
    priorityLevel: "high",
    handoffTargets: ["agent-orchestrator-agent", "operator-agent", "deployment-ops-agent"],
  },
  {
    id: "deployment-ops-agent",
    name: "Deployment Ops Agent",
    role: "Environment readiness and release operations",
    description:
      "Owns environment coordination, rollout safety, verification checkpoints, and rollback planning once work is ready to ship.",
    capabilities: ["deployment_operations", "github_builds", "handoff_planning"],
    acceptedTaskTypes: ["deploy_release", "build_github_delivery", "manage_operator_pipeline"],
    outputSchema: {
      ...taskSchemas(["deploy_release"], deploymentSchema),
      ...taskSchemas(["build_github_delivery"], githubBuildSchema),
      ...taskSchemas(["manage_operator_pipeline"], pipelineSchema),
    },
    status: "busy",
    priorityLevel: "high",
    handoffTargets: ["github-build-agent", "repo-tech", "operator-agent"],
  },
  {
    id: "monetization-agent",
    name: "Monetization Agent",
    role: "Revenue strategy and offer planning",
    description:
      "Converts demand signals into pricing, offers, and monetization experiments so campaigns can connect to concrete business outcomes.",
    capabilities: ["monetization_strategy", "performance_analysis", "campaign_strategy"],
    acceptedTaskTypes: ["design_monetization_plan", "analyze_performance", "build_campaign"],
    outputSchema: {
      ...taskSchemas(["design_monetization_plan"], monetizationSchema),
      ...taskSchemas(["analyze_performance"], analyticsSchema),
      ...taskSchemas(["build_campaign"], campaignSchema),
    },
    status: "available",
    priorityLevel: "medium",
    handoffTargets: ["analytics-agent", "campaign-builder-agent", "brand-voice-agent"],
  },
  {
    id: "agent-orchestrator-agent",
    name: "Agent Orchestrator Agent",
    role: "Multi-agent sequencing and escalation control",
    description:
      "Coordinates complex multi-agent work, resolves sequencing conflicts, and acts as the top-level planner when a request spans multiple specialist lanes.",
    capabilities: ["agent_orchestration", "operator_coordination", "handoff_planning"],
    acceptedTaskTypes: ["orchestrate_agents", "manage_operator_pipeline", "operator_next_move"],
    outputSchema: {
      ...taskSchemas(["orchestrate_agents"], orchestrationSchema),
      ...taskSchemas(["manage_operator_pipeline"], pipelineSchema),
      ...taskSchemas(["operator_next_move"], operatorSchema),
    },
    status: "available",
    priorityLevel: "critical",
    handoffTargets: ["operator-agent", "workflow-architect-agent", "github-build-agent", "campaign-builder-agent"],
  },
];

export function getAgentOperationsSummary() {
  const taskCoverage = new Set(agentRegistry.flatMap((agent) => agent.acceptedTaskTypes));

  return {
    totalAgents: agentRegistry.length,
    taskCoverage: taskCoverage.size,
    availableAgents: agentRegistry.filter((agent) => agent.status === "available").length,
    busyAgents: agentRegistry.filter((agent) => agent.status === "busy").length,
    criticalAgents: agentRegistry.filter((agent) => agent.priorityLevel === "critical").length,
    handoffEdges: agentRegistry.reduce((sum, agent) => sum + agent.handoffTargets.length, 0),
  };
}
