# Distribution Engine

## 1. Distribution architecture

The distribution layer sits after promotions and before any external channel publish step.

- Promotion packages remain the source of truth for captions, media mappings, and channel intent.
- Distribution jobs turn that package into one deployment unit per channel.
- Jobs can run in `mock`, `manual`, `api_ready`, or `future_live` provider modes.
- Current execution is intentionally safe: mock publishing can simulate the end state, while manual mode only prepares a handoff packet.

## 2. Channel adapter pattern

Each channel adapter lives under `lib/distribution/` and implements the same contract:

- `validatePayload`
- `buildPublishRequest`
- `mockPublishResponse`
- `normalizePublishResult`

This keeps channel-specific request shaping separate from the job lifecycle service in `lib/services/distribution.ts`.

## 3. Publishing lifecycle

Distribution jobs move through these states:

- `draft`
- `ready`
- `scheduled`
- `publishing`
- `published`
- `failed`
- `cancelled`

Current behavior:

- `mock` provider can move all the way to `published` and records a normalized mock URL.
- `manual` provider prepares the publish request and moves the job into `publishing` without claiming an external publish happened.
- `api_ready` and `future_live` are readiness states for later server-side provider integrations.

## 4. Review and approval gates

Publishing never bypasses the review system.

- Distribution jobs can create `distribution_job` approval requests.
- Viewer roles cannot publish.
- Reviewer approval is required when the job metadata or upstream promotion state marks the job as approval-gated.
- Owners and admins can override approval gates when necessary.
- Failed publishes create operator-facing alerts through activity events.

## 5. Team permissions

The distribution routes require:

- authenticated context when Supabase auth is active
- team membership
- a publish-capable role

Current role behavior:

- `viewer`: read-only
- `reviewer`: can review, but not publish
- `editor`: can manage and publish distribution jobs
- `operator`: can manage and publish distribution jobs
- `admin` / `owner`: can manage, publish, and override approval gates

## 6. Mock, manual, and live publishing modes

Current supported modes:

- `mock`: safe simulated publish with normalized URL output
- `manual`: prepare the publish handoff without claiming live external deployment

Prepared but not active:

- `api_ready`: credentials may exist later, but no direct provider integration is implemented yet
- `future_live`: reserved for later execution paths

## 7. Future API integrations

The service and adapter layer are intentionally shaped for future server-side integrations:

- platform credentials stay on the server
- adapters can swap mock behavior for real provider calls
- approval gates remain in front of any live publish call
- operator surfaces and activity events already understand the distribution lifecycle

The next step toward live publishing is to replace adapter mock/manual behavior with real provider integrations only when channel credentials and secure server routes are configured.
