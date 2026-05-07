# Integration Roadmap

This file tracks which external integrations are live, which are still mocked,
and what the next provider abstractions look like.

## Status

| Capability                  | Provider           | Status     | Notes                                                                 |
| --------------------------- | ------------------ | ---------- | --------------------------------------------------------------------- |
| Auth                        | Supabase Auth      | Live       | Server client + cookie session                                        |
| Database (media + lookups)  | Supabase Postgres  | Live       | RLS-scoped, mock fallback for unauthenticated / unconfigured installs |
| Storage (uploads/downloads) | Supabase Storage   | Live       | Signed upload + signed download, service role server-side             |
| Image generation            | OpenAI gpt-image-1 | Live       | Mock fallback when `OPENAI_API_KEY` is missing                        |
| Video generation            | —                  | Mock only  | Returns a queued job contract; provider not connected yet             |
| Promotion publishing        | —                  | Mock only  | Caption sets and checklists are generated, no external publish        |

## Image generation (live)

`lib/services/image-generation.ts` runs the following pipeline when
`OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are both set:

1. Validate input (prompt, style, aspect ratio, agent task contract)
2. Resolve the authenticated user's `auth.uid()` via the request-scoped server
   client
3. Generate a UUID for the asset and build the media + thumbnail storage paths
   (`{user_id}/images/{asset_id}.png`)
4. Call `client.images.generate({ model: "gpt-image-1", size, prompt })`
5. Decode the base64 response into bytes
6. Upload the bytes to `media-assets` via the Supabase service role client
7. Best-effort upload of the same image to `media-thumbnails`
8. Call `finalizeUploadedMediaAsset` to insert the row into `public.media_assets`
   with `metadata.provider = "openai"`, `model`, `aspectRatio`, and the OpenAI
   revised prompt when present
9. Return a typed `GenerationResult` with `provider`, `persisted`, `storageReady`,
   and the `assetId`

If either env var is missing, the service falls back to a typed mock result so
the rest of the studio keeps working without credentials.

## Video generation (pending)

`lib/services/video-generation.ts` still returns a queued mock contract. When a
provider is selected (e.g. Runway, Pika, an OpenAI Sora-class endpoint), it
should follow the same pattern as image generation: validate → call provider →
upload bytes → `finalizeUploadedMediaAsset`.

## Future provider abstraction

The current code keeps provider concerns inside the per-modality services. The
type surface is already provider-aware:

- `ImageGenerationProvider = "mock" | "openai"`
- `GenerationResult.provider`, `persisted`, `storageReady`, `assetId`,
  `revisedPrompt`

Steps for the next provider (image or video):

1. Add a new entry to the provider union (e.g. `"runway"`).
2. Create a thin adapter under `lib/<provider>/client.ts` that exposes a
   `getXClient()` and an `isXConfigured()` helper plus any provider-specific
   parameter mappings.
3. In the per-modality service, branch on configured providers (preferred order:
   live providers first, mock last) and call the adapter.
4. Always run the result through `uploadMediaBytes` + `finalizeUploadedMediaAsset`
   so persistence and metadata stay uniform.
5. Keep the mock fallback unchanged — it is the demo/dev safety net.
