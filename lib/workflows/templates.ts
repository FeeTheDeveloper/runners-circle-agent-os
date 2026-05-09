import type { AgentTaskPriority } from "@/lib/types/agents";
import type { WorkflowTemplate, WorkflowTemplateStep, WorkflowStepType } from "@/lib/types/workflows";

function createStep(input: {
  id: string;
  order: number;
  name: string;
  type: WorkflowStepType;
  agentId?: string;
  taskType?: WorkflowTemplateStep["taskType"];
  input?: Record<string, unknown>;
  dependsOn?: string[];
  nextStepId?: string | null;
}): WorkflowTemplateStep {
  return {
    id: input.id,
    order: input.order,
    name: input.name,
    type: input.type,
    agentId: input.agentId,
    taskType: input.taskType,
    input: input.input ?? null,
    dependsOn: input.dependsOn ?? [],
    nextStepId: input.nextStepId ?? null,
  };
}

function createTemplate(input: {
  id: string;
  name: string;
  description: string;
  objective: string;
  defaultPriority: AgentTaskPriority;
  requiredInputs: string[];
  expectedOutputs: string[];
  steps: WorkflowTemplateStep[];
}): WorkflowTemplate {
  return input;
}

export const workflowTemplates: WorkflowTemplate[] = [
  createTemplate({
    id: "image-campaign-workflow",
    name: "Image Campaign Workflow",
    description: "Trigger: prompt for an image campaign asset that needs media packaging, campaign structure, and promotion prep.",
    objective: "Turn one image campaign brief into a reusable media, campaign, and promotion pipeline.",
    defaultPriority: "high",
    requiredInputs: ["brief", "prompt", "campaignName", "channels", "targetAudience", "coreMessage"],
    expectedOutputs: [
      "optimized prompt",
      "image execution package",
      "cataloged media asset",
      "campaign package",
      "promotion package",
      "operator review decision",
    ],
    steps: [
      createStep({
        id: "image-optimize-prompt",
        order: 1,
        name: "Prompt Optimization",
        type: "agent_task",
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        input: {
          stageObjective: "Refine the image brief before generation begins.",
        },
        nextStepId: "image-generate-asset",
      }),
      createStep({
        id: "image-generate-asset",
        order: 2,
        name: "Image Generation",
        type: "generation",
        agentId: "image-generation-agent",
        taskType: "generate_image_prompt",
        input: {
          stageObjective: "Create an execution-ready image prompt contract.",
        },
        dependsOn: ["image-optimize-prompt"],
        nextStepId: "image-catalog-asset",
      }),
      createStep({
        id: "image-catalog-asset",
        order: 3,
        name: "Media Library Intake",
        type: "media_action",
        agentId: "media-librarian-agent",
        taskType: "catalog_media_library",
        input: {
          stageObjective: "Register the generated image inside the media pipeline.",
        },
        dependsOn: ["image-generate-asset"],
        nextStepId: "image-build-campaign",
      }),
      createStep({
        id: "image-build-campaign",
        order: 4,
        name: "Campaign Build",
        type: "campaign_action",
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        input: {
          stageObjective: "Turn the approved image asset into a campaign structure.",
        },
        dependsOn: ["image-catalog-asset"],
        nextStepId: "image-prepare-promotion",
      }),
      createStep({
        id: "image-prepare-promotion",
        order: 5,
        name: "Promotion Prep",
        type: "promotion_action",
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        input: {
          stageObjective: "Prepare channel-ready promotion packaging from the campaign.",
        },
        dependsOn: ["image-build-campaign"],
        nextStepId: "image-operator-review",
      }),
      createStep({
        id: "image-operator-review",
        order: 6,
        name: "Operator Review",
        type: "review_gate",
        agentId: "operator-agent",
        taskType: "review_media",
        input: {
          stageObjective: "Review the packaged campaign output before downstream execution.",
        },
        dependsOn: ["image-prepare-promotion"],
      }),
    ],
  }),
  createTemplate({
    id: "video-campaign-workflow",
    name: "Video Campaign Workflow",
    description: "Trigger: prompt for a launch reel or hero video that needs motion direction, generation, packaging, and review.",
    objective: "Turn a video concept into a promotion-ready campaign workflow with motion planning and operator review.",
    defaultPriority: "high",
    requiredInputs: ["brief", "prompt", "campaignName", "channels", "targetAudience", "coreMessage"],
    expectedOutputs: [
      "motion direction",
      "video execution package",
      "cataloged video asset",
      "campaign package",
      "promotion package",
      "operator review decision",
    ],
    steps: [
      createStep({
        id: "video-motion-direction",
        order: 1,
        name: "Motion Direction",
        type: "agent_task",
        agentId: "motion-director",
        taskType: "direct_motion_concept",
        input: {
          stageObjective: "Shape the motion arc and shot language before generation.",
        },
        nextStepId: "video-generate-asset",
      }),
      createStep({
        id: "video-generate-asset",
        order: 2,
        name: "Video Generation",
        type: "generation",
        agentId: "video-generation-agent",
        taskType: "generate_video_prompt",
        input: {
          stageObjective: "Create a render-ready video prompt package.",
        },
        dependsOn: ["video-motion-direction"],
        nextStepId: "video-catalog-asset",
      }),
      createStep({
        id: "video-catalog-asset",
        order: 3,
        name: "Media Library Intake",
        type: "media_action",
        agentId: "media-librarian-agent",
        taskType: "catalog_media_library",
        input: {
          stageObjective: "Capture the approved video inside the media library workflow.",
        },
        dependsOn: ["video-generate-asset"],
        nextStepId: "video-build-campaign",
      }),
      createStep({
        id: "video-build-campaign",
        order: 4,
        name: "Campaign Build",
        type: "campaign_action",
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        input: {
          stageObjective: "Translate the video asset into a structured launch campaign.",
        },
        dependsOn: ["video-catalog-asset"],
        nextStepId: "video-prepare-promotion",
      }),
      createStep({
        id: "video-prepare-promotion",
        order: 5,
        name: "Promotion Prep",
        type: "promotion_action",
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        input: {
          stageObjective: "Assemble the campaign into a channel-ready promotion package.",
        },
        dependsOn: ["video-build-campaign"],
        nextStepId: "video-operator-review",
      }),
      createStep({
        id: "video-operator-review",
        order: 6,
        name: "Operator Review",
        type: "review_gate",
        agentId: "operator-agent",
        taskType: "review_media",
        input: {
          stageObjective: "Review the motion package before downstream rollout.",
        },
        dependsOn: ["video-prepare-promotion"],
      }),
    ],
  }),
  createTemplate({
    id: "full-launch-campaign-workflow",
    name: "Full Launch Campaign Workflow",
    description: "Trigger: new brand or product launch that needs full creative, media, promotion, analytics, and operator sequencing.",
    objective: "Coordinate a multi-asset launch from creative system design through analytics and final operator oversight.",
    defaultPriority: "urgent",
    requiredInputs: ["brief", "campaignName", "prompt", "channels", "targetAudience", "coreMessage", "callToAction"],
    expectedOutputs: [
      "creative system",
      "brand voice guide",
      "image asset package",
      "video asset package",
      "launch campaign package",
      "promotion package",
      "performance plan",
      "operator action plan",
    ],
    steps: [
      createStep({
        id: "launch-creative-system",
        order: 1,
        name: "Creative System Build",
        type: "agent_task",
        agentId: "creative-systems-builder",
        taskType: "design_creative_system",
        input: {
          stageObjective: "Create the core visual system for the launch.",
        },
        nextStepId: "launch-brand-voice",
      }),
      createStep({
        id: "launch-brand-voice",
        order: 2,
        name: "Brand Voice Design",
        type: "agent_task",
        agentId: "brand-voice-agent",
        taskType: "define_brand_voice",
        input: {
          stageObjective: "Define the launch tone and message system.",
        },
        dependsOn: ["launch-creative-system"],
        nextStepId: "launch-image-generation",
      }),
      createStep({
        id: "launch-image-generation",
        order: 3,
        name: "Launch Image Generation",
        type: "generation",
        agentId: "image-generation-agent",
        taskType: "generate_image_prompt",
        input: {
          stageObjective: "Create image-ready prompt contracts for the launch.",
        },
        dependsOn: ["launch-brand-voice"],
        nextStepId: "launch-video-generation",
      }),
      createStep({
        id: "launch-video-generation",
        order: 4,
        name: "Launch Video Generation",
        type: "generation",
        agentId: "video-generation-agent",
        taskType: "generate_video_prompt",
        input: {
          stageObjective: "Create video-ready prompt contracts for the launch.",
        },
        dependsOn: ["launch-image-generation"],
        nextStepId: "launch-campaign-build",
      }),
      createStep({
        id: "launch-campaign-build",
        order: 5,
        name: "Launch Campaign Build",
        type: "campaign_action",
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        input: {
          stageObjective: "Assemble the image and video assets into one launch campaign.",
        },
        dependsOn: ["launch-video-generation"],
        nextStepId: "launch-promotion-prep",
      }),
      createStep({
        id: "launch-promotion-prep",
        order: 6,
        name: "Launch Promotion Prep",
        type: "promotion_action",
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        input: {
          stageObjective: "Build outbound promotion packaging for the launch channels.",
        },
        dependsOn: ["launch-campaign-build"],
        nextStepId: "launch-analytics-plan",
      }),
      createStep({
        id: "launch-analytics-plan",
        order: 7,
        name: "Analytics Readiness",
        type: "agent_task",
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        input: {
          stageObjective: "Define how the launch performance will be read and adjusted.",
        },
        dependsOn: ["launch-promotion-prep"],
        nextStepId: "launch-operator-check",
      }),
      createStep({
        id: "launch-operator-check",
        order: 8,
        name: "Operator Oversight",
        type: "operator_check",
        agentId: "operator-agent",
        taskType: "manage_operator_pipeline",
        input: {
          stageObjective: "Finalize sequencing and command-room readiness for the launch.",
        },
        dependsOn: ["launch-analytics-plan"],
      }),
    ],
  }),
  createTemplate({
    id: "repo-feature-build-workflow",
    name: "Repo Feature Build Workflow",
    description: "Trigger: a new app feature that needs implementation, build delivery, deployment, and operator validation.",
    objective: "Move a feature request through implementation, build packaging, deployment ops, and operator oversight.",
    defaultPriority: "high",
    requiredInputs: ["brief", "featureName", "acceptanceCriteria", "validationPlan"],
    expectedOutputs: ["implementation plan", "build delivery package", "deployment readiness plan", "operator next action"],
    steps: [
      createStep({
        id: "repo-implementation",
        order: 1,
        name: "Repo Implementation",
        type: "agent_task",
        agentId: "repo-tech",
        taskType: "implement_repo_change",
        input: {
          stageObjective: "Translate the feature request into concrete code changes.",
        },
        nextStepId: "repo-build-delivery",
      }),
      createStep({
        id: "repo-build-delivery",
        order: 2,
        name: "GitHub Build Delivery",
        type: "agent_task",
        agentId: "github-build-agent",
        taskType: "build_github_delivery",
        input: {
          stageObjective: "Package the implementation work for build and branch delivery.",
        },
        dependsOn: ["repo-implementation"],
        nextStepId: "repo-deployment-ops",
      }),
      createStep({
        id: "repo-deployment-ops",
        order: 3,
        name: "Deployment Operations",
        type: "agent_task",
        agentId: "deployment-ops-agent",
        taskType: "deploy_release",
        input: {
          stageObjective: "Prepare rollout, verification, and rollback planning.",
        },
        dependsOn: ["repo-build-delivery"],
        nextStepId: "repo-operator-check",
      }),
      createStep({
        id: "repo-operator-check",
        order: 4,
        name: "Operator Check",
        type: "operator_check",
        agentId: "operator-agent",
        taskType: "manage_operator_pipeline",
        input: {
          stageObjective: "Confirm the feature is sequenced correctly in the operator pipeline.",
        },
        dependsOn: ["repo-deployment-ops"],
      }),
    ],
  }),
  createTemplate({
    id: "performance-optimization-workflow",
    name: "Performance Optimization Workflow",
    description: "Trigger: weak campaign or media performance that needs diagnosis, prompt revision, repackaging, and operator follow-through.",
    objective: "Diagnose weak performance and route improvements back through prompts, campaigns, promotions, and operator action.",
    defaultPriority: "normal",
    requiredInputs: ["brief", "campaignName", "channels", "performanceSymptoms", "callToAction"],
    expectedOutputs: ["performance insights", "optimized prompt strategy", "campaign adjustments", "promotion adjustments", "operator next action"],
    steps: [
      createStep({
        id: "performance-analysis",
        order: 1,
        name: "Performance Analysis",
        type: "agent_task",
        agentId: "analytics-agent",
        taskType: "analyze_performance",
        input: {
          stageObjective: "Diagnose weak campaign or asset performance.",
        },
        nextStepId: "performance-prompt-optimization",
      }),
      createStep({
        id: "performance-prompt-optimization",
        order: 2,
        name: "Prompt Optimization",
        type: "agent_task",
        agentId: "prompt-optimization-agent",
        taskType: "optimize_prompt",
        input: {
          stageObjective: "Refine the upstream prompt strategy based on analytics findings.",
        },
        dependsOn: ["performance-analysis"],
        nextStepId: "performance-campaign-adjustment",
      }),
      createStep({
        id: "performance-campaign-adjustment",
        order: 3,
        name: "Campaign Adjustment",
        type: "campaign_action",
        agentId: "campaign-builder-agent",
        taskType: "build_campaign",
        input: {
          stageObjective: "Apply performance learnings to the campaign structure.",
        },
        dependsOn: ["performance-prompt-optimization"],
        nextStepId: "performance-promotion-adjustment",
      }),
      createStep({
        id: "performance-promotion-adjustment",
        order: 4,
        name: "Promotion Adjustment",
        type: "promotion_action",
        agentId: "promotion-agent",
        taskType: "prepare_promotion",
        input: {
          stageObjective: "Repackage promotion outputs using the updated campaign direction.",
        },
        dependsOn: ["performance-campaign-adjustment"],
        nextStepId: "performance-operator-check",
      }),
      createStep({
        id: "performance-operator-check",
        order: 5,
        name: "Operator Follow-Through",
        type: "operator_check",
        agentId: "operator-agent",
        taskType: "operator_next_move",
        input: {
          stageObjective: "Define the next operator move after optimization work lands.",
        },
        dependsOn: ["performance-promotion-adjustment"],
      }),
    ],
  }),
];
