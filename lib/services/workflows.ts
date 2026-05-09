import { agentRegistry } from "@/lib/agents/registry";
import { DEFAULT_MOCK_TEAM_ID } from "@/lib/data/mock-team";
import {
  applyBrandModeToPrompt,
  applyBrandVoiceToCopy,
  getBrandModeSettings,
  getBrandProfile,
  validateBrandOutput,
} from "@/lib/services/brand";
import {
  createExecutionPackage,
  getExecutionPackage,
  recordExecutionResult,
} from "@/lib/services/agent-execution";
import { createAgentTask, updateAgentTaskStatus } from "@/lib/services/agent-tasks";
import { createCampaign, updateCampaignStatus } from "@/lib/services/campaigns";
import { createMediaAsset, getMediaAssets, updateMediaAssetStatus } from "@/lib/services/media-storage";
import { preparePromotionPackage, updatePromotionStatus } from "@/lib/services/promotions";
import { checkUsageLimit, consumeUsageCredit, recordUsageEvent } from "@/lib/services/usage";
import { campaignChannels, campaignObjectives, type CampaignChannel, type CampaignObjective } from "@/lib/types/campaigns";
import type { AgentTaskPriority } from "@/lib/types/agents";
import { type PromotionChannel, promotionChannels } from "@/lib/types/promotions";
import type { AgentExecutionPackage } from "@/lib/types/agent-execution";
import type {
  WorkflowOperationalSummary,
  WorkflowProgress,
  WorkflowRun,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowTemplate,
  WorkflowTemplateStep,
} from "@/lib/types/workflows";
import { workflowTemplates } from "@/lib/workflows/templates";

const workflowRunsStore: WorkflowRun[] = [];
const DEFAULT_IMAGE_PLACEHOLDER = "/assets/placeholders/generated-image-1.svg";
const DEFAULT_VIDEO_PLACEHOLDER = "/assets/placeholders/generated-video-1.svg";

function nowIso() {
  return new Date().toISOString();
}

function createWorkflowRunId() {
  return `workflow_run_${crypto.randomUUID().slice(0, 8)}`;
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function cloneTemplateStep(step: WorkflowTemplateStep): WorkflowTemplateStep {
  return {
    ...step,
    input: step.input ? cloneValue(step.input) : null,
    dependsOn: [...step.dependsOn],
  };
}

function cloneRunStep(step: WorkflowStep): WorkflowStep {
  return {
    ...step,
    input: step.input ? cloneValue(step.input) : null,
    output: step.output ? cloneValue(step.output) : null,
    dependsOn: [...step.dependsOn],
  };
}

function cloneRun(run: WorkflowRun): WorkflowRun {
  return {
    ...run,
    input: cloneValue(run.input),
    steps: run.steps.map(cloneRunStep),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

function getTemplateMap() {
  return new Map(workflowTemplates.map((template) => [template.id, template]));
}

function getTemplateByIdInternal(id: string) {
  return getTemplateMap().get(id) ?? null;
}

function buildRunSteps(template: WorkflowTemplate): WorkflowStep[] {
  return template.steps
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      id: step.id,
      order: step.order,
      name: step.name,
      type: step.type,
      agentId: step.agentId,
      taskType: step.taskType,
      status: "pending" as WorkflowStepStatus,
      input: step.input ? cloneValue(step.input) : null,
      output: null,
      dependsOn: [...step.dependsOn],
      nextStepId: step.nextStepId,
      agentTaskId: null,
      executionPackageId: null,
      error: null,
      activatedAt: null,
      completedAt: null,
    }));
}

function getPriority(input: Record<string, unknown>, template: WorkflowTemplate): AgentTaskPriority {
  const raw = input.priority;

  if (raw === "low" || raw === "normal" || raw === "high" || raw === "urgent") {
    return raw;
  }

  return template.defaultPriority;
}

function normalizeCampaignObjective(value: unknown): CampaignObjective {
  const requested = asString(value).toLowerCase();

  if ((campaignObjectives as readonly string[]).includes(requested)) {
    return requested as CampaignObjective;
  }

  if (requested.includes("launch")) {
    return "launch";
  }

  if (requested.includes("community")) {
    return "community_growth";
  }

  if (requested.includes("lead")) {
    return "lead_generation";
  }

  if (requested.includes("retarget")) {
    return "retargeting";
  }

  if (requested.includes("engage")) {
    return "engagement";
  }

  return "awareness";
}

function normalizeCampaignChannels(value: unknown): CampaignChannel[] {
  const normalized = asStringArray(value).filter((entry): entry is CampaignChannel =>
    (campaignChannels as readonly string[]).includes(entry),
  );

  return normalized.length > 0 ? normalized : ["instagram", "website"];
}

function normalizePromotionChannels(value: unknown): PromotionChannel[] {
  const normalized = asStringArray(value).filter((entry): entry is PromotionChannel =>
    (promotionChannels as readonly string[]).includes(entry),
  );

  return normalized.length > 0 ? normalized : ["instagram", "website"];
}

function getRunMediaAssetIds(run: WorkflowRun) {
  const explicitIds = asStringArray(run.input.mediaAssetIds);

  if (explicitIds.length > 0) {
    return dedupe(explicitIds);
  }

  const fallbackId = getMediaAssets()[0]?.id;
  return fallbackId ? [fallbackId] : [];
}

function setRunMediaAssetIds(run: WorkflowRun, mediaAssetIds: string[]) {
  run.input.mediaAssetIds = dedupe(mediaAssetIds);
}

function getWorkflowBrandContext(run: WorkflowRun | { input: Record<string, unknown> }) {
  const userId = asString(run.input.userId, "mock-user");
  const brandProfile = getBrandProfile(userId);
  const storedSettings = getBrandModeSettings(userId);
  const brandModeEnabled = asBoolean(run.input.brandModeEnabled, storedSettings.enabled);

  return {
    userId,
    brandProfile,
    brandModeSettings: {
      ...storedSettings,
      enabled: brandModeEnabled,
    },
    brandModeEnabled,
  };
}

function buildNormalizedWorkflowInput(template: WorkflowTemplate, input: Record<string, unknown>) {
  const brief = asString(input.brief, `${template.name} brief`);
  const prompt = asString(input.prompt, brief);
  const campaignName = asString(input.campaignName, `${template.name} Run`);
  const channels = normalizeCampaignChannels(input.channels);
  const brandContext = getWorkflowBrandContext({ input });

  return {
    ...input,
    userId: brandContext.userId,
    brief,
    prompt,
    request: asString(input.request, brief),
    campaignName,
    featureName: asString(input.featureName, campaignName),
    objective: asString(input.objective, template.objective),
    campaignObjective: normalizeCampaignObjective(input.campaignObjective ?? input.objective ?? template.objective),
    channels,
    targetAudience: asString(input.targetAudience, "Runners Circle audience"),
    coreMessage: asString(input.coreMessage, template.objective),
    tone: asString(input.tone, "confident and direct"),
    callToAction: asString(input.callToAction, "Move the next launch step forward."),
    performanceSymptoms: asString(input.performanceSymptoms, "Performance is softer than expected across the current campaign lane."),
    acceptanceCriteria: asString(input.acceptanceCriteria, "Ship the requested workflow outcome without breaking the current pipeline."),
    validationPlan: asString(input.validationPlan, "Run lint, typecheck, build, and confirm operator-facing workflow readiness."),
    teamId: asString(input.teamId, DEFAULT_MOCK_TEAM_ID),
    brandProfileId: brandContext.brandProfile.id,
    brandProfileName: brandContext.brandProfile.name,
    brandTone: brandContext.brandProfile.tone,
    brandModeEnabled: brandContext.brandModeEnabled,
    brandModeSettings: cloneValue(brandContext.brandModeSettings),
    mediaAssetIds: getRunMediaAssetIds({
      id: "draft",
      templateId: template.id,
      status: "draft",
      input,
      steps: [],
      currentStepId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }),
    priority: getPriority(input, template),
  };
}

function findRun(runId: string) {
  return workflowRunsStore.find((run) => run.id === runId) ?? null;
}

function findStep(run: WorkflowRun, stepId: string) {
  return run.steps.find((step) => step.id === stepId) ?? null;
}

function getAgentName(agentId: string | undefined) {
  if (!agentId) {
    return null;
  }

  return agentRegistry.find((agent) => agent.id === agentId)?.name ?? agentId;
}

function buildStepInput(run: WorkflowRun, template: WorkflowTemplate, step: WorkflowStep) {
  const brandContext = getWorkflowBrandContext(run);
  const completedSteps = run.steps
    .filter((entry) => entry.status === "completed")
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      taskType: entry.taskType ?? null,
      output: entry.output,
    }));

  return {
    workflowRunId: run.id,
    templateId: template.id,
    templateName: template.name,
    workflowObjective: template.objective,
    workflowStatus: run.status,
    currentStep: {
      id: step.id,
      name: step.name,
      type: step.type,
      agentId: step.agentId ?? null,
      taskType: step.taskType ?? null,
    },
    workflowInput: cloneValue(run.input),
    completedSteps,
    requiredOutputs: template.expectedOutputs,
    requiredInputs: template.requiredInputs,
    relatedEntities: {
      mediaAssetIds: getRunMediaAssetIds(run),
      campaignId: asString(run.input.campaignId) || null,
      promotionPackageId: asString(run.input.promotionPackageId) || null,
    },
    brand: {
      brandProfileId: brandContext.brandProfile.id,
      brandProfileName: brandContext.brandProfile.name,
      brandTone: brandContext.brandProfile.tone,
      brandModeEnabled: brandContext.brandModeEnabled,
      brandModeSettings: cloneValue(brandContext.brandModeSettings),
    },
  };
}

function applyBrandContextToStepInput(run: WorkflowRun, step: WorkflowStep, activationInput: Record<string, unknown>) {
  const brandContext = getWorkflowBrandContext(run);
  const nextInput: Record<string, unknown> = {
    ...activationInput,
    brandProfileId: brandContext.brandProfile.id,
    brandProfileName: brandContext.brandProfile.name,
    brandTone: brandContext.brandProfile.tone,
    brandModeEnabled: brandContext.brandModeEnabled,
    brandModeSettings: cloneValue(brandContext.brandModeSettings),
  };

  if (!brandContext.brandModeEnabled) {
    return nextInput;
  }

  if (step.taskType === "generate_image_prompt" || step.taskType === "generate_video_prompt") {
    const promptModifier = applyBrandModeToPrompt({
      basePrompt: asString(nextInput.prompt, asString(run.input.prompt, asString(run.input.brief, step.name))),
      userId: brandContext.userId,
      kind: step.taskType === "generate_video_prompt" ? "video" : "image",
      brandProfile: brandContext.brandProfile,
      brandModeSettings: brandContext.brandModeSettings,
    });
    const brandValidation = validateBrandOutput({
      content: promptModifier.enhancedPrompt,
      brandProfile: brandContext.brandProfile,
    });

    nextInput.prompt = promptModifier.enhancedPrompt;
    nextInput.originalPrompt = promptModifier.originalPrompt;
    nextInput.enhancedPrompt = promptModifier.enhancedPrompt;
    nextInput.brandInjectedDirection = promptModifier.injectedBrandDirection;
    nextInput.brandValidation = brandValidation;
    return nextInput;
  }

  if (step.taskType === "build_campaign") {
    const coreMessage = applyBrandVoiceToCopy({
      baseCopy: asString(nextInput.coreMessage, asString(run.input.coreMessage, asString(run.input.objective, step.name))),
      userId: brandContext.userId,
      brandProfile: brandContext.brandProfile,
      brandModeSettings: brandContext.brandModeSettings,
    });
    const promptModifier = applyBrandModeToPrompt({
      basePrompt: asString(nextInput.prompt, asString(run.input.prompt, asString(run.input.brief, step.name))),
      userId: brandContext.userId,
      kind: "campaign",
      brandProfile: brandContext.brandProfile,
      brandModeSettings: brandContext.brandModeSettings,
    });

    nextInput.coreMessage = coreMessage.enhancedCopy;
    nextInput.prompt = promptModifier.enhancedPrompt;
    nextInput.originalPrompt = promptModifier.originalPrompt;
    nextInput.enhancedPrompt = promptModifier.enhancedPrompt;
    nextInput.brandInjectedDirection = promptModifier.injectedBrandDirection;
    return nextInput;
  }

  if (step.taskType === "prepare_promotion") {
    const promptModifier = applyBrandModeToPrompt({
      basePrompt: asString(nextInput.prompt, asString(run.input.prompt, asString(run.input.brief, step.name))),
      userId: brandContext.userId,
      kind: "promotion",
      brandProfile: brandContext.brandProfile,
      brandModeSettings: brandContext.brandModeSettings,
    });
    const callToAction = applyBrandVoiceToCopy({
      baseCopy: asString(nextInput.callToAction, asString(run.input.callToAction, "Move the release forward.")),
      userId: brandContext.userId,
      brandProfile: brandContext.brandProfile,
      brandModeSettings: brandContext.brandModeSettings,
    });

    nextInput.prompt = promptModifier.enhancedPrompt;
    nextInput.originalPrompt = promptModifier.originalPrompt;
    nextInput.enhancedPrompt = promptModifier.enhancedPrompt;
    nextInput.callToAction = callToAction.enhancedCopy;
    nextInput.tone = `${brandContext.brandProfile.tone}, disciplined, platform-ready`;
    nextInput.brandInjectedDirection = promptModifier.injectedBrandDirection;
  }

  return nextInput;
}

function getLatestCompletedOutput(run: WorkflowRun) {
  const completedSteps = run.steps
    .filter((step) => step.status === "completed" && step.output)
    .sort(
      (left, right) =>
        Date.parse(right.completedAt ?? right.activatedAt ?? run.updatedAt) -
        Date.parse(left.completedAt ?? left.activatedAt ?? run.updatedAt),
    );

  return completedSteps[0]?.output ?? null;
}

function activateStep(run: WorkflowRun, step: WorkflowStep) {
  const template = getTemplateByIdInternal(run.templateId);

  if (!template) {
    step.status = "failed";
    step.error = `Unknown template "${run.templateId}".`;
    run.status = "failed";
    run.updatedAt = nowIso();
    return;
  }

  const activationInput = {
    ...(step.input ?? {}),
    ...buildStepInput(run, template, step),
    latestCompletedOutput: getLatestCompletedOutput(run),
  };
  const brandAwareInput = applyBrandContextToStepInput(run, step, activationInput);

  step.input = brandAwareInput;
  step.status = "ready";
  step.activatedAt = nowIso();
  step.error = null;
  run.currentStepId = step.id;
  run.updatedAt = nowIso();

  if (!step.agentId || !step.taskType) {
    run.status = run.steps.some((entry) => entry.status === "completed") ? "running" : "ready";
    return;
  }

  const taskResult = createAgentTask({
    agentId: step.agentId,
    taskType: step.taskType,
    priority: getPriority(run.input, template),
    input: brandAwareInput,
    userId: run.requestedByUserId ?? "mock-user",
    teamId: run.teamId ?? DEFAULT_MOCK_TEAM_ID,
  });

  if (!taskResult.success) {
    step.status = "failed";
    step.error = taskResult.error.message;
    run.status = "failed";
    return;
  }

  step.agentTaskId = taskResult.data.id;

  const executionPackage = createExecutionPackage(taskResult.data.id);

  if (executionPackage) {
    step.executionPackageId = executionPackage.id;
  }

  run.status = run.steps.some((entry) => entry.status === "completed") ? "running" : "ready";
}

function findNextStep(run: WorkflowRun, currentStep: WorkflowStep) {
  if (currentStep.nextStepId) {
    return findStep(run, currentStep.nextStepId);
  }

  const completedStepIds = new Set(
    run.steps.filter((step) => step.status === "completed").map((step) => step.id),
  );

  return (
    run.steps
      .filter((step) => step.status === "pending")
      .sort((left, right) => left.order - right.order)
      .find((step) => step.dependsOn.every((dependencyId) => completedStepIds.has(dependencyId))) ?? null
  );
}

function buildGeneratedMediaTitle(run: WorkflowRun, step: WorkflowStep) {
  const campaignName = asString(run.input.campaignName);

  if (campaignName) {
    return step.taskType === "generate_video_prompt" ? `${campaignName} Hero Video` : `${campaignName} Hero Image`;
  }

  return step.taskType === "generate_video_prompt" ? "Generated Workflow Video" : "Generated Workflow Image";
}

function applyStepSideEffects(run: WorkflowRun, step: WorkflowStep, output: Record<string, unknown>) {
  const nextOutput: Record<string, unknown> = { ...output };
  const brandContext = getWorkflowBrandContext(run);

  if (step.taskType === "generate_image_prompt" || step.taskType === "generate_video_prompt") {
    const isVideo = step.taskType === "generate_video_prompt";
    const originalPrompt = asString(output.originalPrompt, asString(step.input?.originalPrompt, asString(run.input.prompt, asString(run.input.brief, step.name))));
    const enhancedPrompt = asString(output.enhancedPrompt, asString(output.prompt, asString(step.input?.enhancedPrompt, originalPrompt)));
    const asset = createMediaAsset({
      type: isVideo ? "video" : "image",
      title: buildGeneratedMediaTitle(run, step),
      prompt: enhancedPrompt,
      thumbnailUrl: isVideo ? DEFAULT_VIDEO_PLACEHOLDER : DEFAULT_IMAGE_PLACEHOLDER,
      mediaUrl: isVideo ? DEFAULT_VIDEO_PLACEHOLDER : DEFAULT_IMAGE_PLACEHOLDER,
      userId: brandContext.userId,
      teamId: run.teamId ?? DEFAULT_MOCK_TEAM_ID,
      status: "ready",
      assignedAgentId: step.agentId ?? (isVideo ? "video-generation-agent" : "image-generation-agent"),
      generationJobId: step.agentTaskId ?? null,
      campaignId: null,
      metadata: {
        originalPrompt,
        enhancedPrompt,
        brandProfileId: brandContext.brandProfile.id,
        brandProfileName: brandContext.brandProfile.name,
        brandTone: brandContext.brandProfile.tone,
        brandModeApplied: brandContext.brandModeEnabled,
      },
    });

    setRunMediaAssetIds(run, [...getRunMediaAssetIds(run), asset.id]);
    nextOutput.mediaAssetId = asset.id;
    nextOutput.mediaAssetIds = getRunMediaAssetIds(run);
    nextOutput.mediaStatus = asset.status;
    nextOutput.brandProfileId = brandContext.brandProfile.id;
    nextOutput.brandProfileName = brandContext.brandProfile.name;
    nextOutput.brandTone = brandContext.brandProfile.tone;
    nextOutput.brandModeApplied = brandContext.brandModeEnabled;
  }

  if (step.taskType === "catalog_media_library") {
    const mediaAssetIds = getRunMediaAssetIds(run);
    mediaAssetIds.forEach((mediaAssetId) => updateMediaAssetStatus(mediaAssetId, "ready"));
    nextOutput.mediaAssetIds = mediaAssetIds;
    nextOutput.libraryState = "cataloged";
  }

  if (step.taskType === "build_campaign") {
    const mediaAssetIds = getRunMediaAssetIds(run);
    const campaignResult = createCampaign({
      name: asString(run.input.campaignName, `${step.name} Campaign`),
      objective: normalizeCampaignObjective(run.input.campaignObjective ?? run.input.objective),
      channels: normalizeCampaignChannels(run.input.channels),
      mediaAssetIds,
      targetAudience: asString(run.input.targetAudience, "Runners Circle audience"),
      coreMessage: asString(run.input.coreMessage, asString(run.input.brief, "Campaign message pending.")),
      assignedAgentId: step.agentId ?? "campaign-builder-agent",
      teamId: run.teamId ?? DEFAULT_MOCK_TEAM_ID,
      userId: brandContext.userId,
      brandModeEnabled: brandContext.brandModeEnabled,
    });

    if (campaignResult.success) {
      run.input.campaignId = campaignResult.data.campaign.id;
      updateCampaignStatus(campaignResult.data.campaign.id, "ready");
      nextOutput.campaignId = campaignResult.data.campaign.id;
      nextOutput.campaignStatus = "ready";
      nextOutput.campaignAssetIds = campaignResult.data.assets.map((asset) => asset.id);
      nextOutput.brandProfileId = campaignResult.data.campaign.brandProfileId ?? brandContext.brandProfile.id;
      nextOutput.brandProfileName = campaignResult.data.campaign.brandProfileName ?? brandContext.brandProfile.name;
      nextOutput.brandTone = campaignResult.data.campaign.brandTone ?? brandContext.brandProfile.tone;
      nextOutput.brandModeApplied = campaignResult.data.campaign.brandModeApplied ?? brandContext.brandModeEnabled;
    } else {
      nextOutput.campaignError = campaignResult.error.message;
    }
  }

  if (step.taskType === "prepare_promotion") {
    const campaignId = asString(run.input.campaignId);

    if (campaignId) {
      const promotionResult = preparePromotionPackage({
        campaignId,
        mediaAssetIds: getRunMediaAssetIds(run),
        channels: normalizePromotionChannels(run.input.channels),
        tone: asString(run.input.tone, "confident and direct"),
        callToAction: asString(run.input.callToAction, "Move the release forward."),
        assignedAgentId: step.agentId ?? "promotion-agent",
        teamId: run.teamId ?? DEFAULT_MOCK_TEAM_ID,
        userId: brandContext.userId,
        brandModeEnabled: brandContext.brandModeEnabled,
      });

      if (promotionResult.success) {
        run.input.promotionPackageId = promotionResult.data.promotionPackage.id;
        updatePromotionStatus(promotionResult.data.promotionPackage.id, "ready_for_review");
        nextOutput.promotionPackageId = promotionResult.data.promotionPackage.id;
        nextOutput.promotionStatus = "ready_for_review";
        nextOutput.brandProfileId = promotionResult.data.promotionPackage.brandProfileId ?? brandContext.brandProfile.id;
        nextOutput.brandProfileName = promotionResult.data.promotionPackage.brandProfileName ?? brandContext.brandProfile.name;
        nextOutput.brandTone = promotionResult.data.promotionPackage.brandTone ?? brandContext.brandProfile.tone;
        nextOutput.brandModeApplied = promotionResult.data.promotionPackage.brandModeApplied ?? brandContext.brandModeEnabled;
      } else {
        nextOutput.promotionError = promotionResult.error.message;
      }
    } else {
      nextOutput.promotionError = "Campaign id was missing when promotion prep was reached.";
    }
  }

  if (step.type === "review_gate" || step.type === "operator_check") {
    const decision = asString(output.decision, "recorded");
    const campaignId = asString(run.input.campaignId);
    const promotionPackageId = asString(run.input.promotionPackageId);

    if (campaignId) {
      updateCampaignStatus(campaignId, "ready");
    }

    if (promotionPackageId) {
      updatePromotionStatus(promotionPackageId, decision === "approve" ? "approved" : "ready_for_review");
      nextOutput.promotionPackageId = promotionPackageId;
      nextOutput.promotionStatus = decision === "approve" ? "approved" : "ready_for_review";
    }

    nextOutput.operatorDecision = decision;
    nextOutput.brandProfileId = brandContext.brandProfile.id;
    nextOutput.brandProfileName = brandContext.brandProfile.name;
    nextOutput.brandTone = brandContext.brandProfile.tone;
    nextOutput.brandModeApplied = brandContext.brandModeEnabled;
  }

  return nextOutput;
}

function recordWorkflowExecutionResult(
  step: WorkflowStep,
  status: AgentExecutionPackage["status"],
  output: Record<string, unknown> | null,
  nextRecommendedAgentId: string | null,
  reviewNotes: string,
) {
  if (!step.executionPackageId) {
    return;
  }

  recordExecutionResult({
    packageId: step.executionPackageId,
    status,
    output,
    reviewNotes,
    nextRecommendedAgentId,
  });
}

function buildNextAction(run: WorkflowRun) {
  if (run.status === "failed") {
    const failedStep = run.steps.find((step) => step.status === "failed");
    return failedStep ? `Resolve the failure in ${failedStep.name}.` : "Resolve the failed workflow state.";
  }

  if (run.status === "needs_review") {
    const reviewStep = run.steps.find((step) => step.status === "needs_review");
    return reviewStep ? `Review ${reviewStep.name} before the workflow can continue.` : "Review the workflow output.";
  }

  if (run.status === "completed") {
    return "Workflow completed. Review downstream campaign, media, or promotion outputs.";
  }

  const currentStep = run.currentStepId ? findStep(run, run.currentStepId) : null;

  if (!currentStep) {
    return "Activate the next workflow step.";
  }

  if (currentStep.executionPackageId) {
    const executionPackage = getExecutionPackage(currentStep.executionPackageId);
    const agentName = getAgentName(currentStep.agentId) ?? "the assigned agent";

    if (executionPackage) {
      return `Copy the ${agentName} prompt package and complete ${currentStep.name} in ${executionPackage.executionMode} mode.`;
    }
  }

  return `Advance ${currentStep.name} when its manual step is complete.`;
}

export function getWorkflowTemplates() {
  return workflowTemplates.map((template) => ({
    ...template,
    steps: template.steps.map(cloneTemplateStep),
    requiredInputs: [...template.requiredInputs],
    expectedOutputs: [...template.expectedOutputs],
  }));
}

export function getWorkflowTemplateById(id: string) {
  const template = getTemplateByIdInternal(id);

  if (!template) {
    return null;
  }

  return {
    ...template,
    steps: template.steps.map(cloneTemplateStep),
    requiredInputs: [...template.requiredInputs],
    expectedOutputs: [...template.expectedOutputs],
  };
}

export function createWorkflowRun(templateId: string, input: Record<string, unknown>) {
  const template = getTemplateByIdInternal(templateId);

  if (!template) {
    return null;
  }

  const teamId = asString(input.teamId, DEFAULT_MOCK_TEAM_ID);
  const requestedByUserId = asString(input.userId, "mock-user");
  const usageSummary = checkUsageLimit({
    userId: requestedByUserId,
    teamId,
    type: "workflow_run",
  });
  const timestamp = nowIso();
  const run: WorkflowRun = {
    id: createWorkflowRunId(),
    teamId,
    requestedByUserId,
    reviewStatus: null,
    assignedReviewerId: null,
    templateId: template.id,
    status: "draft",
    input: buildNormalizedWorkflowInput(template, input),
    steps: buildRunSteps(template),
    currentStepId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    usageSummary,
  };

  const firstStep = run.steps.slice().sort((left, right) => left.order - right.order)[0] ?? null;

  if (firstStep) {
    activateStep(run, firstStep);
  }

  workflowRunsStore.unshift(run);
  consumeUsageCredit({
    userId: requestedByUserId,
    teamId,
    type: "workflow_run",
  });
  recordUsageEvent({
    userId: requestedByUserId,
    teamId,
    type: "workflow_run",
    relatedEntityType: "workflow_run",
    relatedEntityId: run.id,
    metadata: {
      templateId: run.templateId,
      warning: usageSummary.warning,
    },
  });

  // TODO: Persist workflow runs, step state, and linked entity ids once the database-backed workflow layer exists.
  // TODO: Replace manual execution package handoff with a supported direct ChatGPT Agent API bridge when available.

  return cloneRun(run);
}

export function getWorkflowRuns() {
  return workflowRunsStore
    .slice()
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map(cloneRun);
}

export function getWorkflowRunById(id: string) {
  const run = findRun(id);
  return run ? cloneRun(run) : null;
}

export function advanceWorkflowStep(runId: string, stepId: string, output: Record<string, unknown> = {}) {
  const run = findRun(runId);

  if (!run) {
    return null;
  }

  const step = findStep(run, stepId);

  if (!step || step.status === "completed" || step.status === "failed") {
    return null;
  }

  const enrichedOutput = applyStepSideEffects(run, step, output);
  step.output = enrichedOutput;
  step.status = "completed";
  step.completedAt = nowIso();
  step.error = null;
  run.updatedAt = nowIso();

  if (step.agentTaskId) {
    updateAgentTaskStatus(step.agentTaskId, "completed");
  }

  const nextStep = findNextStep(run, step);
  recordWorkflowExecutionResult(
    step,
    "completed",
    enrichedOutput,
    nextStep?.agentId ?? null,
    `Workflow step "${step.name}" was marked completed from the workflow builder.`,
  );

  if (nextStep) {
    activateStep(run, nextStep);
    run.status = "running";
  } else {
    run.currentStepId = null;
    run.status = "completed";
  }

  run.updatedAt = nowIso();

  return cloneRun(run);
}

export function markWorkflowStepNeedsReview(runId: string, stepId: string) {
  const run = findRun(runId);

  if (!run) {
    return null;
  }

  const step = findStep(run, stepId);

  if (!step) {
    return null;
  }

  step.status = "needs_review";
  step.output = {
    ...(step.output ?? {}),
    workflowReviewState: "needs_review",
  };
  step.error = null;
  run.status = "needs_review";
  run.currentStepId = step.id;
  run.updatedAt = nowIso();

  if (step.agentTaskId) {
    updateAgentTaskStatus(step.agentTaskId, "needs_review");
  }

  recordWorkflowExecutionResult(
    step,
    "needs_review",
    step.output,
    "operator-agent",
    `Workflow step "${step.name}" needs review before it can continue.`,
  );

  return cloneRun(run);
}

export function failWorkflowStep(runId: string, stepId: string, error: string) {
  const run = findRun(runId);

  if (!run) {
    return null;
  }

  const step = findStep(run, stepId);

  if (!step) {
    return null;
  }

  step.status = "failed";
  step.error = error;
  step.output = {
    ...(step.output ?? {}),
    workflowError: error,
  };
  run.status = "failed";
  run.currentStepId = step.id;
  run.updatedAt = nowIso();

  if (step.agentTaskId) {
    updateAgentTaskStatus(step.agentTaskId, "failed");
  }

  recordWorkflowExecutionResult(
    step,
    "failed",
    step.output,
    "operator-agent",
    `Workflow step "${step.name}" failed in the workflow builder: ${error}`,
  );

  return cloneRun(run);
}

export function getWorkflowProgress(runId: string): WorkflowProgress | null {
  const run = findRun(runId);

  if (!run) {
    return null;
  }

  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter((step) => step.status === "completed").length;
  const needsReviewSteps = run.steps.filter((step) => step.status === "needs_review").length;
  const failedSteps = run.steps.filter((step) => step.status === "failed").length;
  const pendingSteps = run.steps.filter((step) => step.status === "pending").length;
  const currentStep = run.currentStepId ? findStep(run, run.currentStepId) : null;

  return {
    runId: run.id,
    templateId: run.templateId,
    status: run.status,
    totalSteps,
    completedSteps,
    needsReviewSteps,
    failedSteps,
    pendingSteps,
    percentComplete: totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100),
    currentStepId: currentStep?.id ?? null,
    currentStepName: currentStep?.name ?? null,
    currentAgentId: currentStep?.agentId ?? null,
    currentTaskType: currentStep?.taskType ?? null,
    nextAction: buildNextAction(run),
  };
}

export function getWorkflowOperationalSummary(): WorkflowOperationalSummary {
  const runs = workflowRunsStore;
  const sortedActiveRuns = runs
    .filter((run) => run.status !== "completed")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

  return {
    totalRuns: runs.length,
    activeRuns: runs.filter((run) => ["ready", "running", "paused", "needs_review"].includes(run.status)).length,
    readyRuns: runs.filter((run) => run.status === "ready").length,
    runningRuns: runs.filter((run) => run.status === "running").length,
    stuckRuns: runs.filter((run) => ["paused", "needs_review", "failed"].includes(run.status)).length,
    needsReviewRuns: runs.filter((run) => run.status === "needs_review").length,
    completedRuns: runs.filter((run) => run.status === "completed").length,
    failedRuns: runs.filter((run) => run.status === "failed").length,
    nextActionRunId: sortedActiveRuns[0]?.id ?? null,
    nextAction: sortedActiveRuns[0] ? buildNextAction(sortedActiveRuns[0]) : null,
  };
}
