# Workflow Builder

## Current Mode

The Workflow Builder in `runners-circle-agent-os` creates reusable multi-agent run templates that connect Studio-style briefs, agent routing, execution packages, media creation, campaign packaging, promotion prep, and operator review.

Current execution remains manual or assisted:

- Workflow steps create real agent task records.
- Agent-backed steps create real execution packages through the Live Agent Execution Bridge.
- Users still copy prompts into the matching ChatGPT Agent manually until a supported direct execution API exists.

The app does not claim automated ChatGPT Agent execution today.

## Workflow Template Structure

Each workflow template defines:

- `id`
- `name`
- `description`
- `objective`
- `steps`
- `defaultPriority`
- `requiredInputs`
- `expectedOutputs`

Each step defines:

- `id`
- `order`
- `name`
- `type`
- `agentId` when the step is agent-backed
- `taskType` when the step maps to the internal agent registry
- `dependsOn`
- `nextStepId`

Supported step types:

- `agent_task`
- `generation`
- `media_action`
- `campaign_action`
- `promotion_action`
- `review_gate`
- `operator_check`

## Workflow Run Lifecycle

Workflow runs move through these statuses:

- `draft`
- `ready`
- `running`
- `paused`
- `needs_review`
- `completed`
- `failed`

Typical lifecycle:

1. A user starts a workflow template from `/workflows` or the dashboard launcher.
2. The first step is activated and, if agent-backed, a task record plus execution package is created.
3. The user copies the generated prompt into the matching ChatGPT Agent manually.
4. The user records the result back into the workflow step.
5. The workflow activates the next step and repeats until completion.

## Multi-Agent Step Sequencing

The builder currently ships with these reusable templates:

1. Image Campaign Workflow
2. Video Campaign Workflow
3. Full Launch Campaign Workflow
4. Repo Feature Build Workflow
5. Performance Optimization Workflow

Sequencing is explicit and step-based:

- Steps can depend on prior steps.
- Each step activates only when its dependencies are complete.
- Agent-backed steps create execution packages only when that step becomes active.
- Review and operator steps preserve manual oversight instead of skipping directly to completion.

## Execution Package Handoff

When a step has both `agentId` and `taskType`, the workflow service:

1. Creates an internal agent task record.
2. Creates an execution package through `lib/services/agent-execution.ts`.
3. Stores the execution package id on the workflow step.
4. Exposes the prompt inside the workflow detail page for copy-and-paste handoff.

This keeps the workflow chain connected to the same manual execution bridge used elsewhere in the app.

## Manual Mode Now

Current manual workflow loop:

1. Open a workflow run.
2. Copy the current step prompt package.
3. Paste it into the matching ChatGPT Agent manually.
4. Bring the agent output back into the workflow step as structured JSON.
5. Mark the step completed, needing review, or failed.

This preserves honest execution tracking without implying unsupported automation.

## Future Automated Mode

Future automation can layer on top of the current contract by adding:

- persistent workflow storage
- direct execution package dispatch
- ChatGPT Agent result callbacks
- step-level realtime status updates
- automatic downstream handoff activation

The current contract is intentionally shaped so those capabilities can be added without replacing the workflow model.

## Connections To Campaigns, Promotions, and Media

The workflow service currently connects to existing foundations in these ways:

- generation steps create media records in the Media Library mock layer
- campaign steps create campaign records through the campaign service
- promotion steps create promotion packages through the promotion service
- operator and review steps keep manual approval inside the command layer

This means workflow runs are not isolated UI objects. They already feed the same media, campaign, promotion, agent-task, and execution-package surfaces the rest of the app uses.
