# Live Agent Execution Bridge

This document explains the current execution bridge between the internal agent registry and real ChatGPT Agent usage.

## 1. Current limitation

- `runners-circle-agent-os` does **not** automatically execute ChatGPT Agents today.
- The current bridge supports `manual` and `assisted` execution modes only.
- `api_ready` and `automated_future` are contract states reserved for a later direct integration path.
- The current implementation packages tasks, generates handoff prompts, tracks package status, and records results after a human runs the matching ChatGPT Agent manually.

## 2. Execution package structure

Each execution package contains:

- `id`
- `taskId`
- `agentId`
- `agentName`
- `executionMode`
- `status`
- `taskType`
- `priority`
- `instructionPrompt`
- `contextPayload`
- `expectedOutputSchema`
- `handoffTargets`
- `createdAt`
- `updatedAt`

The package is the portable handoff contract between the dashboard and a real ChatGPT Agent conversation.

## 3. How the dashboard creates a package

1. A task already exists in the internal task layer.
2. The user presses `Create execution package`.
3. The bridge looks up the task, assigned agent, router plan, output schema, and handoff targets.
4. The bridge generates:
   - a clean `instructionPrompt`
   - a structured `contextPayload`
   - a `packaged` execution record
5. The package is stored in the current in-memory mock store for tracking.

The current API route for this step is:

- `POST /api/agents/execution-package`

## 4. How the user copies the prompt into ChatGPT Agent

1. Create the execution package from the dashboard or operator console.
2. Press `Copy prompt`.
3. Open the matching ChatGPT Agent manually.
4. Paste the generated `instructionPrompt`.
5. Run the task in ChatGPT using that prompt and the included context.

This is intentionally explicit so the app does not pretend a live execution bridge exists when it does not.

## 5. How the result is recorded

After the human-run ChatGPT Agent returns an output:

1. The output can be recorded against the execution package.
2. The bridge stores:
   - `status`
   - `output`
   - `reviewNotes`
   - `nextRecommendedAgentId`
3. The execution package status is updated to match the recorded result state.

The current API route for this step is:

- `POST /api/agents/execution-result`

This enables execution tracking without claiming direct automated execution.

## 6. Future automated execution plan

Future automation can extend this bridge in a few stages:

1. Persist execution packages and results in Supabase instead of memory.
2. Attach external ChatGPT Agent identifiers to registry entries.
3. Add a supported dispatch layer for live ChatGPT Agent API calls when one exists.
4. Capture live execution telemetry:
   - dispatch timestamps
   - run ids
   - raw outputs
   - retry history
   - failure reasons
5. Turn `api_ready` into a real runtime mode.
6. Later support `automated_future` for fully orchestrated multi-agent execution once the external integration is real and stable.
