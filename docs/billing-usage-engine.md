# Billing + Usage Credits Engine

## 1. Plan tiers

Runners Circle Agent OS now includes five billing tiers:

- `free`
- `creator`
- `pro`
- `agency`
- `enterprise`

Each plan maps to a typed entitlement contract for:

- image credits
- video jobs
- agent task credits
- workflow credits
- storage limits
- campaign limits
- distribution limits
- team seat limits

## 2. Credit system

The billing engine tracks usage with three connected records:

- `billing_accounts`: plan state, provider mode, subscription placeholders
- `usage_credit_balances`: remaining credits and storage consumption
- `usage_events`: event stream for image, video, workflow, campaign, distribution, storage, and download activity

The current implementation uses mock and server-managed fallback behavior. It is safe for demo and internal workflows and does not require live checkout.

## 3. Usage events

Tracked usage event types:

- `image_generation`
- `video_generation`
- `agent_task`
- `workflow_run`
- `media_download`
- `storage_upload`
- `distribution_job`
- `campaign_created`

These events are recorded after successful service actions and can be surfaced in billing, dashboard, and operator views.

## 4. Soft enforcement mode

Usage enforcement defaults to `soft`.

That means:

- actions still run in mock and internal mode
- warnings are returned when limits are near or exceeded
- upgrade recommendations are attached without blocking the workflow

Strict blocking is reserved for future production enforcement flows.

## 5. Future Stripe integration

The billing engine intentionally does **not** wire live Stripe checkout yet.

Current status:

- no checkout session creation
- no webhook handling
- no browser exposure of billing secrets
- no automatic subscription mutation

Future work:

- Stripe customer sync
- subscription checkout
- webhook-driven plan state updates
- invoice and payment failure handling

## 6. Cost protection strategy

The engine is designed to reduce AI and storage overrun risk by:

- checking usage before spend-heavy actions
- consuming credits only after successful actions
- keeping storage metering separate from generation metering
- surfacing low-credit and seat-pressure warnings in operator-facing pages
- preserving mock fallback so demos are not blocked by plan exhaustion

## 7. Enterprise and custom plans

`enterprise` is modeled as a custom-plan contract.

That means:

- prices can be `null`
- limits can be `null`
- support level stays custom
- checkout remains manual until a live billing workflow is requested

## Implementation notes

Primary files:

- `lib/types/billing.ts`
- `lib/billing/plans.ts`
- `lib/services/billing.ts`
- `lib/services/usage.ts`
- `app/billing/page.tsx`

Integration points:

- generation services
- agent task creation
- workflow launches
- campaign creation
- media storage/finalization
- distribution job creation

The engine is ready for future persistence and checkout wiring without changing the public contract layer again.
