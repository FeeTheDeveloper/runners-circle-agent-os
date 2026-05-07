import { AppShell } from "@/components/layout/app-shell";
import { PromptPanel } from "@/components/studio/prompt-panel";
import { isOpenAIConfigured } from "@/lib/openai/client";

export default function StudioImagePage() {
  const openAiReady = isOpenAIConfigured();

  return (
    <AppShell
      eyebrow="Studio / Image"
      title="Build and validate direct image generation contracts."
      description={
        openAiReady
          ? "This lane sends prompts to OpenAI gpt-image-1, uploads the result to Supabase Storage, and persists a media_assets record under your account."
          : "This lane captures image prompts and validates the selected agent contract. Without OPENAI_API_KEY, it returns a mock completed result so the studio stays usable."
      }
      action={
        openAiReady ? (
          <div className="status-pill border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
            Live OpenAI · gpt-image-1
          </div>
        ) : (
          <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">Mock fallback active</div>
        )
      }
    >
      <PromptPanel
        mode="image"
        title="Image generation contract"
        description={
          openAiReady
            ? "Submit the prompt payload. The image lane runs OpenAI image generation, persists the asset, and surfaces a download link in the result panel."
            : "Submit the prompt payload that the image execution agent will eventually consume. Without OPENAI_API_KEY, the response is a typed mock result that preserves the assigned agent id."
        }
        defaultPrompt="Generate premium hero imagery for a runners apparel drop: athlete in motion, refined product detail, charcoal environment, orange edge lighting, and editorial campaign confidence."
      />

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Image Standards</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">What this request contract should lock down</h2>
          <div className="mt-6 space-y-3">
            {[
              "Prompt language and subject focus",
              "Style direction for the image agent",
              "Aspect ratio for downstream media usage",
              "Brand mode toggle for Runners Circle tone",
              "Assigned agent id for the execution layer",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Current Behavior</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            {openAiReady ? "Live OpenAI image generation is connected." : "Image requests resolve immediately in mock mode."}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            {openAiReady
              ? "The service validates the prompt contract, calls OpenAI gpt-image-1, uploads the bytes to the media-assets bucket, optionally writes a thumbnail, and persists a media_assets row scoped to your user. The studio result panel then offers a signed download."
              : "The service validates the prompt contract and selected agent, then returns a completed image-generation result with a mock preview URL and media reference. Real model execution and persistence are still deferred until OPENAI_API_KEY is configured."}
          </p>
        </article>
      </section>
    </AppShell>
  );
}
