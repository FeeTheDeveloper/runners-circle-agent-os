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
    shotList: { type: "array", description: "Optional sequence of beats or shots.", itemsType: "string" },
  },
);

const reviewSchema = createOutputSchema(
  "Media review contract used before campaign packaging.",
  ["decision", "summary"],
  {
    decision: { type: "string", description: "Approve, revise, or reject.", enum: ["approve", "revise", "reject"] },
    summary: { type: "string", description: "Top-level review summary." },
    findings: { type: "array", description: "Specific review observations.", itemsType: "string" },
  },
);

const campaignSchema = createOutputSchema(
  "Campaign build contract based on approved assets.",
  ["campaignTitle", "objective", "channels"],
  {
    campaignTitle: { type: "string", description: "Final campaign name." },
    objective: { type: "string", description: "Campaign objective." },
    channels: { type: "array", description: "Target distribution channels.", itemsType: "string" },
    assetPlan: { type: "array", description: "How assets should be used in the campaign.", itemsType: "string" },
  },
);

const promotionSchema = createOutputSchema(
  "Promotion preparation contract for outbound marketing.",
  ["packageTitle", "channels", "deliverables"],
  {
    packageTitle: { type: "string", description: "Promotion package title." },
    channels: { type: "array", description: "Target promotion channels.", itemsType: "string" },
    deliverables: { type: "array", description: "Required promotion outputs.", itemsType: "string" },
    notes: { type: "string", description: "Operator notes for final prep." },
  },
);

const captionPackSchema = createOutputSchema(
  "Caption pack contract for channel-specific copy development.",
  ["captions", "callToActions"],
  {
    captions: { type: "array", description: "Draft caption options.", itemsType: "string" },
    callToActions: { type: "array", description: "Suggested CTAs.", itemsType: "string" },
    hashtags: { type: "array", description: "Suggested hashtags when relevant.", itemsType: "string" },
  },
);

const analyticsSchema = createOutputSchema(
  "Performance analysis contract for campaign insight work.",
  ["summary", "insights", "recommendations"],
  {
    summary: { type: "string", description: "Performance summary." },
    insights: { type: "array", description: "Observed performance insights.", itemsType: "string" },
    recommendations: { type: "array", description: "Recommended next actions.", itemsType: "string" },
  },
);

const repoAuditSchema = createOutputSchema(
  "Repository audit contract for platform and codebase review.",
  ["summary", "risks", "recommendations"],
  {
    summary: { type: "string", description: "Audit summary." },
    risks: { type: "array", description: "Risks found in the repository.", itemsType: "string" },
    recommendations: { type: "array", description: "Suggested follow-up actions.", itemsType: "string" },
  },
);

const operatorSchema = createOutputSchema(
  "Operator guidance contract for the next recommended move.",
  ["currentState", "nextMoves"],
  {
    currentState: { type: "string", description: "Current operator state assessment." },
    nextMoves: { type: "array", description: "Recommended next moves.", itemsType: "string" },
    escalationNotes: { type: "array", description: "Escalation or follow-up notes.", itemsType: "string" },
  },
);

function taskSchemas(taskTypes: AgentTaskType[], schema: AgentOutputSchema) {
  return Object.fromEntries(taskTypes.map((taskType) => [taskType, schema])) as Partial<
    Record<AgentTaskType, AgentOutputSchema>
  >;
}

export const agentRegistry: AgentRegistryEntry[] = [
  {
    id: "creative-director",
    name: "Creative Director Agent",
    role: "Creative Direction",
    description: "Shapes core creative direction and translates broad ideas into stronger prompt-ready concepts.",
    capabilities: ["creative_direction", "prompt_strategy", "image_direction", "video_direction", "media_review"],
    acceptedTaskTypes: ["generate_image_prompt", "generate_video_prompt", "review_media"],
    outputSchema: {
      generate_image_prompt: imagePromptSchema,
      generate_video_prompt: videoPromptSchema,
      review_media: reviewSchema,
    },
    status: "available",
  },
  {
    id: "image-generation",
    name: "Image Generation Agent",
    role: "Image Prompt Design",
    description: "Specializes in crafting image-generation prompts and visual direction packets.",
    capabilities: ["prompt_strategy", "image_direction"],
    acceptedTaskTypes: ["generate_image_prompt", "review_media"],
    outputSchema: {
      generate_image_prompt: imagePromptSchema,
      review_media: reviewSchema,
    },
    status: "available",
  },
  {
    id: "video-generation",
    name: "Video Generation Agent",
    role: "Video Prompt Design",
    description: "Builds shot-driven motion concepts and structured video prompt packages.",
    capabilities: ["prompt_strategy", "video_direction"],
    acceptedTaskTypes: ["generate_video_prompt", "review_media"],
    outputSchema: {
      generate_video_prompt: videoPromptSchema,
      review_media: reviewSchema,
    },
    status: "busy",
  },
  {
    id: "campaign-builder",
    name: "Campaign Builder Agent",
    role: "Campaign Strategy",
    description: "Packages approved media into campaign structures, rollout plans, and asset usage maps.",
    capabilities: ["campaign_strategy", "caption_writing"],
    acceptedTaskTypes: ["build_campaign", "create_caption_pack"],
    outputSchema: {
      build_campaign: campaignSchema,
      create_caption_pack: captionPackSchema,
    },
    status: "available",
  },
  {
    id: "promotion",
    name: "Promotion Agent",
    role: "Promotion Packaging",
    description: "Prepares campaign assets for direct promotion and outbound channel use.",
    capabilities: ["promotion_packaging", "caption_writing"],
    acceptedTaskTypes: ["prepare_promotion", "create_caption_pack"],
    outputSchema: {
      prepare_promotion: promotionSchema,
      create_caption_pack: captionPackSchema,
    },
    status: "available",
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    role: "Performance Analysis",
    description: "Analyzes campaign performance and proposes optimization directions for future creative work.",
    capabilities: ["performance_analysis"],
    acceptedTaskTypes: ["analyze_performance"],
    outputSchema: taskSchemas(["analyze_performance"], analyticsSchema),
    status: "offline",
  },
  {
    id: "repo-architect",
    name: "Repo Architect Agent",
    role: "Repository Auditing",
    description: "Reviews architecture and repository structure for maintainability, risk, and delivery readiness.",
    capabilities: ["repo_auditing"],
    acceptedTaskTypes: ["audit_repo"],
    outputSchema: taskSchemas(["audit_repo"], repoAuditSchema),
    status: "available",
  },
  {
    id: "operator",
    name: "Operator Agent",
    role: "Operator Guidance",
    description: "Recommends next moves, highlights blockers, and keeps the command layer coordinated.",
    capabilities: ["operator_guidance", "media_review"],
    acceptedTaskTypes: ["operator_next_move", "review_media"],
    outputSchema: {
      operator_next_move: operatorSchema,
      review_media: reviewSchema,
    },
    status: "available",
  },
];

export function getAgentOperationsSummary() {
  const taskCoverage = new Set(agentRegistry.flatMap((agent) => agent.acceptedTaskTypes));

  return {
    totalAgents: agentRegistry.length,
    taskCoverage: taskCoverage.size,
    availableAgents: agentRegistry.filter((agent) => agent.status === "available").length,
  };
}
