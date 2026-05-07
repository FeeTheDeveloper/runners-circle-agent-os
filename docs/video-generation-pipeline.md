# Video Generation Pipeline

This document describes the job-based architecture for video generation in
Runners Circle Agent OS. The pipeline is designed so that today's mock provider
and tomorrow's real renderer use the same database rows, the same API contract,
the same studio UI, and the same operator surface.

## 1. Why video is job-based

Image generation can resolve in the same HTTP request because OpenAI returns
the bytes in seconds. Video renders take minutes (or hours) and must survive:

- request timeouts on serverless platforms
- worker restarts during long renders
- retries when an external provider transiently fails

Modeling the work as a row in `generation_jobs` makes those problems tractable:
the request is accepted, persisted, and acknowledged with `202 Accepted`, while
the worker advances state asynchronously.

## 2. Job lifecycle

```
queued → processing → rendering → uploading → completed
                          │
                          ├─→ failed
                          └─→ cancelled
```

| Status       | Meaning                                                           |
| ------------ | ----------------------------------------------------------------- |
| `queued`     | Accepted, waiting for a render slot                               |
| `processing` | Worker preparing prompt + storyboard / agent assembly             |
| `rendering`  | Provider is producing frames                                      |
| `uploading`  | Worker is uploading the rendered MP4 to Supabase Storage          |
| `completed`  | `generation_jobs.media_asset_id` is set; asset visible in library |
| `failed`     | Render failed; `error_message` populated                          |
| `cancelled`  | Job was cancelled before completion                               |

Progress is a 0–100 integer that the studio UI renders as a progress bar.

## 3. Queue contract

`lib/services/render-queue.ts` exposes a typed queue contract:

- `enqueueVideoJob(jobId)`
- `dequeueVideoJob()`
- `peekVideoQueue()`
- `processNextVideoJob()`
- `retryVideoJob(jobId)`
- `cancelVideoJob(jobId)`
- `failVideoJobInQueue(jobId, errorMessage)`
- `getRenderQueueDepth()`

The current implementation is in-memory and lives in the same Node process as
the API routes — it's a contract surface, not a durable queue. The TODO at the
end of the file lists the swap-in options:

- Vercel Cron calling `processNextVideoJob` on a schedule
- Supabase Edge Function pulling rows from `generation_jobs` by status
- Dedicated worker (Cloudflare Queues, Upstash QStash, Trigger.dev)

## 4. API endpoints

| Method | Path                                          | Purpose                                          |
| ------ | --------------------------------------------- | ------------------------------------------------ |
| POST   | `/api/generate/video`                         | Validate input, create job row, enqueue, 202     |
| GET    | `/api/generate/video/[jobId]`                 | Return current job (ownership-scoped)            |
| POST   | `/api/generate/video/[jobId]/process`         | Advance the job by one mock step (worker hook)   |

POST `/api/generate/video` returns:

```json
{
  "success": true,
  "data": {
    "job": { "id": "<uuid>", "status": "queued", "progress": 0 },
    "nextStep": "Video job queued. Poll the job endpoint for updates."
  }
}
```

GET `/api/generate/video/[jobId]` returns the full `VideoGenerationJob`
including provider, format, duration, motion style, prompt, error, linked media
asset, and metadata.

POST `/api/generate/video/[jobId]/process` exists so a cron / worker / manual
test can advance state machines without exposing internals to the studio. It
is also what the studio's "Process Mock Step" button calls.

## 5. Mock processing

In mock mode the service walks one stage at a time:

```
queued (0%) → processing (15%) → rendering (55%) → uploading (85%) → completed (100%)
```

Each call to `POST /api/generate/video/[jobId]/process` advances exactly one
state. When the job reaches `completed`, the service synthesizes a mock SVG
preview, calls `createMediaAssetRecord` (or the in-memory fallback), and links
the new asset id back into `generation_jobs.media_asset_id`. The asset shows up
in the Media Library card list, the studio video card unlocks the Download
button, and an activity event is logged.

The studio also polls the job every 4 seconds while the job is active
(`queued`, `processing`, `rendering`, `uploading`).

## 6. Future OpenAI / external renderer integration

The video service already accepts `provider: "mock" | "openai" | "external_renderer"`.
To plug in a real renderer:

1. Branch in `processVideoGenerationJob` (or in a new `processOpenAIVideoJob`)
   based on `job.provider`.
2. Submit the render to the provider, store the provider job id in
   `metadata.externalJobId`, and move the row to `rendering`.
3. Poll the provider (Edge Function, Vercel Cron, dedicated worker) until the
   render completes.
4. Download the MP4, hand it to `uploadMediaBytes` for the `media-assets`
   bucket, optionally produce a poster frame in `media-thumbnails`.
5. Call `finalizeUploadedMediaAsset` to insert the row in `media_assets`, then
   `updateVideoJobStatus(jobId, "completed", 100, { outputMediaAssetId })`.
6. Log `video_render_completed` and let RLS handle ownership for downstream
   consumers.

## 7. Storage handoff

Mock completion does not upload any bytes — the linked media asset has
`storageBucket: null` and `storagePath: null`, but it is real enough to render
in the Media Library and to round-trip the download API in mock fallback mode.

Provider completion is expected to:

- Upload the final MP4 to `media-assets/{user_id}/videos/{asset_id}.mp4`
- Optionally upload a poster frame to `media-thumbnails/{user_id}/{asset_id}.jpg`
- Persist content type, file name, and metadata via `finalizeUploadedMediaAsset`

The same RLS policies that protect image assets protect video assets.

## 8. Operator monitoring

The Operator Console picks up video jobs in two places:

- **Queue snapshot** — adds a fourth column showing counts for every
  `VideoJobStatus` value.
- **Render Queue panel** — lists queued + active jobs and failed renders, with
  job ids, progress, and provider markers; surfaces the in-memory queue depth
  and the count of jobs that completed today.

Failed video jobs also flow into the failure feed via the shared failure
snapshot, and the activity log emits `video_job_queued`, `video_render_started`,
`video_render_completed`, and `video_render_failed` events for each transition.
