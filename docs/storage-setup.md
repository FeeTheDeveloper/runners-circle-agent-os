# Media Storage Setup

This guide walks through the end-to-end media persistence flow used by Runners
Circle Agent OS. The flow is split into three coordinated steps so that the
client never receives the service role key, while every metadata write lands in
`public.media_assets` under the user's row-level-security boundary.

## End-to-end flow

1. `POST /api/media/upload-url`
2. Client uploads bytes directly to Supabase Storage with the signed URL.
3. `POST /api/media/finalize-upload`
4. `media_assets` row exists with `id`, `storage_bucket`, `storage_path`.
5. `POST /api/media/download` returns a signed download URL and writes a
   `download_events` row.

The mock fallback path mirrors the same shape, but skips Supabase and returns
in-memory records. This keeps the developer experience working without
credentials.

## 1. Upload URL step

Endpoint: `POST /api/media/upload-url`

Request:

```json
{
  "type": "image",
  "title": "Night Run Campaign Visual",
  "prompt": "Cinematic urban runner at night...",
  "assignedAgentId": "image-generation-agent",
  "generationJobId": null,
  "campaignId": null,
  "externalId": null
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "asset": {
      "id": "<UUID>",
      "userId": "<auth.uid>",
      "type": "image",
      "status": "processing",
      "storageBucket": "media-assets",
      "storagePath": "<user_id>/images/<asset_id>.png",
      "source": "mock"
    },
    "upload": {
      "assetId": "<UUID>",
      "bucket": "media-assets",
      "path": "<user_id>/images/<asset_id>.png",
      "storagePath": "<user_id>/images/<asset_id>.png",
      "signedUrl": "https://...",
      "uploadUrl": "https://...",
      "token": "<token-or-null>",
      "expiresAt": "2026-05-07T18:30:00.000Z"
    }
  }
}
```

The server generates a UUID `assetId` (`generateMediaAssetUuid`) before signing
the upload URL, so the path always matches the persisted database row.

> **Path layout.** The path must NOT include the bucket name. Correct shape:
> `bucket: "media-assets"` + `path: "<user_id>/images/<asset_id>.png"`. A path
> like `media-assets/<user_id>/images/<asset_id>.png` is incorrect and will
> fail RLS, since the policy reads `(storage.foldername(name))[1]` and expects
> `auth.uid()::text` in the first segment.

## 2. Client upload step

The client PUTs (or POSTs) the file directly to Supabase Storage using the
returned `signedUrl`. No proxying through this app is required.

```ts
await fetch(signedUrl, {
  method: "PUT",
  headers: { "Content-Type": contentType },
  body: file,
});
```

## 3. Finalize upload step

Endpoint: `POST /api/media/finalize-upload`

Request:

```json
{
  "assetId": "<UUID returned by upload-url>",
  "assetType": "image",
  "title": "Night Run Campaign Visual",
  "prompt": "Cinematic urban runner at night...",
  "storageBucket": "media-assets",
  "storagePath": "<user_id>/images/<asset_id>.png",
  "thumbnailBucket": "media-thumbnails",
  "thumbnailPath": "<user_id>/<asset_id>.jpg",
  "contentType": "image/png",
  "fileName": "night-run.png",
  "assignedAgentId": "image-generation-agent",
  "generationJobId": null,
  "externalId": null
}
```

Successful response:

```json
{
  "success": true,
  "data": {
    "mediaAsset": { "id": "<UUID>", "status": "ready" }
  }
}
```

Error response shape:

```json
{
  "success": false,
  "error": { "message": "...", "code": "VALIDATION_ERROR" }
}
```

When Supabase env is configured and the user is authenticated, the call inserts
a row into `public.media_assets` using the request-bound server client (RLS
enforced). When Supabase is not configured, the call writes to the in-memory
mock store instead, so the rest of the app keeps working.

## 4. `media_assets` DB record

Schema (`supabase/schema.sql`):

| column                | type                         | notes                                |
| --------------------- | ---------------------------- | ------------------------------------ |
| `id`                  | `uuid primary key`           | `gen_random_uuid()` default          |
| `user_id`             | `uuid not null`              | FK to `auth.users(id)`               |
| `external_id`         | `text` (unique when present) | optional legacy / external mapping   |
| `generation_job_id`   | `uuid`                       | FK to `generation_jobs(id)`          |
| `media_type`          | `text`                       | `image` or `video`                   |
| `status`              | `text`                       | `processing`, `ready`, `failed`, ... |
| `storage_bucket`      | `text`                       | e.g. `media-assets`                  |
| `storage_path`        | `text`                       | does **not** contain the bucket name |
| `thumbnail_bucket`    | `text`                       | e.g. `media-thumbnails`              |
| `thumbnail_path`      | `text`                       | sibling thumbnail location           |
| `assigned_agent_id`   | `text`                       | logical agent owning the asset       |
| `content_type`        | `text`                       | original upload content type         |
| `file_name`           | `text`                       | original upload file name            |
| `metadata`            | `jsonb`                      | extra fields, e.g. `campaignId`      |

RLS allows `auth.uid() = user_id` for select / insert / update / delete.

## 5. Signed download step

Endpoint: `POST /api/media/download`

Request:

```json
{ "mediaAssetId": "<UUID-or-externalId>" }
```

Behavior:

- Accepts both a `media_assets.id` UUID and an `external_id` value.
- When Supabase env is configured **and** the user is authenticated, the route
  reads from `public.media_assets`, builds a signed URL from
  `storage_bucket` + `storage_path`, and inserts a row in
  `public.download_events`.
- When Supabase env is missing, the route falls back to the mock in-memory
  store (which honours `media_xxx` mock IDs and returns deterministic mock
  download URLs).
- Returns `{ downloadUrl, fileName, expiresAt }`.

## 6. Mock fallback behavior

- If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing,
  every persistence path is short-circuited to the in-memory store seeded by
  `lib/data/media.ts`.
- If Supabase is configured but the request is unauthenticated, persistence
  routes still fall back to mock so demos and previews continue to work.
- The Media Library page renders a `mock` or `persisted` badge so reviewers
  can see which path is active.
- Mock seed data uses `media_001` style ids; persisted records use UUIDs.

## 7. UUID vs `external_id`

- The DB primary key is always a UUID (`gen_random_uuid()`).
- `external_id` is a free-form text column with a partial unique index
  (`where external_id is not null`). It is the place to record legacy ids,
  client-generated ids, or seed identifiers like `media_001` so the app can
  resolve a record either way.
- API endpoints that accept a `mediaAssetId` look up by UUID **or** by
  `external_id`, so the front-end can pass whichever it has.

## Bucket and policy reference

Buckets created by `supabase/storage.sql`:

- `media-assets` — primary upload destination (private)
- `media-thumbnails` — derived thumbnails (private)
- `campaign-exports` — packaged campaign downloads (private)

Storage policies enforce that `(storage.foldername(name))[1] = auth.uid()::text`
for select / insert / update / delete on each of these buckets. This is why
upload paths must always start with the user's UUID.
