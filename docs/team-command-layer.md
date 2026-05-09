# Team Command Layer

## Team Architecture

The team command layer turns `runners-circle-agent-os` into a shared operating system without removing single-user mode.

Core concepts:

- `teams` define the shared workspace boundary
- `team_members` define who belongs to that workspace
- collaborative records can carry `team_id`
- approvals are tracked through `approval_requests`
- operator, workflow, campaign, media, promotion, and execution views can all read from the same review layer

The current implementation supports:

- mock fallback mode
- a default mock team for local command-layer development
- Supabase-backed team reads and writes when auth and database access are configured

## Role System

Supported team roles:

- `owner`
- `admin`
- `operator`
- `editor`
- `reviewer`
- `viewer`

Behavior today:

- owners and admins can manage membership
- operators help manage workflow and execution movement
- editors can contribute operational work
- reviewers handle approvals and changes requests
- viewers are read-only in the team model

## Approval Flow

Approval requests are stored as `approval_requests` and support these entity types:

- `media_asset`
- `campaign`
- `promotion_package`
- `workflow_run`
- `execution_package`

Approval statuses:

- `pending_review`
- `approved`
- `rejected`
- `changes_requested`

Flow:

1. A user requests review from a card or workflow detail view.
2. The app creates an approval request and assigns a reviewer.
3. The item appears in `/reviews` and the operator review queue.
4. A reviewer approves, rejects, or requests changes.
5. The latest decision is reflected back on the original entity surface.

## Review Workflow

Reviews are surfaced in multiple places:

- `/reviews` for dedicated review management
- `/operator` for command-room review pressure
- media, campaign, promotion, and workflow cards for local approval context

The review UI keeps the flow explicit:

- request review
- assign a reviewer
- record notes
- approve
- reject
- request changes

This avoids pretending the system can silently auto-approve downstream work.

## Realtime Event Structure

`lib/services/realtime.ts` provides the current realtime contract.

Tracked channels:

- activity feed updates
- workflow updates
- review queue updates
- generation progress updates
- operator queue updates

Behavior:

- uses Supabase Realtime when configured
- falls back gracefully when realtime is unavailable
- exposes readiness summaries and a task feed for the operator console

Current limitation:

- the realtime layer is readiness-oriented today
- it does not claim fully live collaborative sync unless Supabase Realtime and persisted records are active

## Future Collaboration Roadmap

Planned follow-on work:

- persist workflow runs and approval requests fully in Supabase
- add explicit assignee fields for finer RLS and workload routing
- stream collaborative changes into client views in realtime
- add comments, annotations, and entity-level discussion threads
- add multi-team switching in the dashboard shell
- connect approval completion to deeper automation and execution orchestration

The current contract is designed so those features can be layered in without replacing the existing manual and mock-safe operating model.
