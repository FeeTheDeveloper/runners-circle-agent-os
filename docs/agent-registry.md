# Agent Registry

This document describes the final internal registry for the ChatGPT Agents now mirrored inside `runners-circle-agent-os`.

## 1. Full agent roster

| Agent | Role | Accepted task types |
| --- | --- | --- |
| GitHub Build Agent | Build and release delivery | `build_github_delivery`, `deploy_release` |
| Creative Systems Builder | Creative system design | `design_creative_system`, `review_media` |
| Motion Director | Motion concept and sequence direction | `direct_motion_concept`, `review_media` |
| Repo Tech | Repository implementation and architecture | `implement_repo_change`, `audit_repo`, `build_github_delivery` |
| Operator Agent | Command-center coordination | `operator_next_move`, `manage_operator_pipeline`, `review_media` |
| Campaign Builder Agent | Campaign structure and rollout planning | `build_campaign`, `create_caption_pack`, `review_media` |
| Promotion Agent | Launch packaging and channel delivery prep | `prepare_promotion`, `create_caption_pack`, `review_media` |
| Image Generation Agent | Image prompt execution design | `generate_image_prompt`, `review_media` |
| Video Generation Agent | Video prompt execution design | `generate_video_prompt`, `review_media` |
| Analytics Agent | Performance insight and signal analysis | `analyze_performance` |
| Brand Voice Agent | Tone system and copy calibration | `define_brand_voice`, `create_caption_pack` |
| Media Librarian Agent | Media organization and retrieval readiness | `catalog_media_library`, `review_media` |
| Prompt Optimization Agent | Prompt hardening and variant design | `optimize_prompt` |
| Workflow Architect Agent | Workflow and orchestration design | `architect_workflow`, `manage_operator_pipeline`, `orchestrate_agents` |
| Deployment Ops Agent | Environment readiness and release operations | `deploy_release`, `build_github_delivery`, `manage_operator_pipeline` |
| Monetization Agent | Revenue strategy and offer planning | `design_monetization_plan`, `analyze_performance`, `build_campaign` |
| Agent Orchestrator Agent | Multi-agent sequencing and escalation control | `orchestrate_agents`, `manage_operator_pipeline`, `operator_next_move` |

## 2. Each agent role

- GitHub Build Agent owns branch-to-build delivery and release packaging.
- Creative Systems Builder defines reusable visual systems before prompt execution.
- Motion Director shapes motion structure, story arcs, and shot logic.
- Repo Tech handles codebase changes, implementation planning, and repo review.
- Operator Agent triages the command room and recommends next moves.
- Campaign Builder Agent turns approved assets into structured campaigns.
- Promotion Agent packages campaigns into outbound promotion bundles.
- Image Generation Agent creates execution-ready image prompt packets.
- Video Generation Agent creates execution-ready video prompt packets.
- Analytics Agent reads performance and conversion signals.
- Brand Voice Agent keeps copy and tone aligned to the brand system.
- Media Librarian Agent keeps assets organized, tagged, and retrievable.
- Prompt Optimization Agent hardens prompts before execution.
- Workflow Architect Agent designs repeatable handoff and automation flows.
- Deployment Ops Agent owns rollout safety, verification, and rollback planning.
- Monetization Agent translates demand signals into offers and pricing experiments.
- Agent Orchestrator Agent coordinates multi-agent sequencing when requests span lanes.

## 3. Accepted task types

- Creative and media: `design_creative_system`, `direct_motion_concept`, `generate_image_prompt`, `generate_video_prompt`, `review_media`, `catalog_media_library`, `optimize_prompt`, `define_brand_voice`
- Marketing and growth: `build_campaign`, `prepare_promotion`, `create_caption_pack`, `analyze_performance`, `design_monetization_plan`
- Technical delivery: `implement_repo_change`, `audit_repo`, `build_github_delivery`, `deploy_release`
- Coordination and orchestration: `operator_next_move`, `manage_operator_pipeline`, `architect_workflow`, `orchestrate_agents`

## 4. Handoff logic

- Prompt work usually starts with system or direction agents, then passes through prompt optimization, then lands with the execution agent, then returns to operator review.
- Campaign work uses analytics for context, Campaign Builder for structure, Brand Voice for copy alignment, and Promotion Agent for outbound packaging.
- Technical work uses Repo Tech for implementation, GitHub Build Agent for build delivery, and Deployment Ops Agent for release execution.
- Complex or urgent work can be escalated into Agent Orchestrator Agent and Operator Agent before the primary lane runs.
- Media Librarian Agent sits after generation or review when the asset needs retrieval, metadata cleanup, or archive readiness.

## 5. Routing examples

### Example: image prompt request

Input:

```ts
routeTaskToAgent({
  request: "Create a premium hero image for the launch page",
  taskType: "generate_image_prompt",
  priority: "normal",
});
```

Expected route:

- Primary: `image-generation-agent`
- Support: `creative-systems-builder`, `prompt-optimization-agent`, `operator-agent`
- Handoff flow: creative system -> prompt optimization -> image generation -> operator review

### Example: campaign build request

Input:

```ts
routeTaskToAgent({
  request: "Build a launch campaign for approved image and reel assets",
  taskType: "build_campaign",
  priority: "high",
});
```

Expected route:

- Primary: `campaign-builder-agent`
- Support: `agent-orchestrator-agent`, `analytics-agent`, `brand-voice-agent`, `promotion-agent`
- Handoff flow: analytics -> campaign build -> brand voice -> promotion packaging

### Example: urgent release request

Input:

```ts
routeTaskToAgent({
  request: "Ship the release and watch rollback risk",
  taskType: "deploy_release",
  priority: "urgent",
});
```

Expected route:

- Primary: `deployment-ops-agent`
- Support: `operator-agent`, `agent-orchestrator-agent`, `github-build-agent`
- Handoff flow: operator triage -> orchestration -> build delivery -> deployment ops -> operator follow-up

## 6. Future live ChatGPT Agent execution notes

- The current registry is the internal source of truth for UI display, validation, and deterministic routing.
- Live ChatGPT Agent execution can later attach external agent identifiers to each registry entry without changing the routing surface.
- The `outputSchema` field is already structured so task payloads can be validated before being sent to a live execution bridge.
- The `handoffTargets` field is intentionally explicit so a future execution engine can authorize only known downstream agents.
- The operator console is already prepared to show route readiness and active pipeline state before realtime execution wiring is introduced.
