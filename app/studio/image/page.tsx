import { AppShell } from "@/components/layout/app-shell";
import { PromptPanel } from "@/components/studio/prompt-panel";

export default function StudioImagePage() {
  return (
    <AppShell
      eyebrow="Studio / Image"
      title="Build and validate direct image generation contracts."
      description="This lane captures image prompts, validates the selected agent contract, and returns a mock completed result without real OpenAI generation, storage, or database persistence."
      action={<div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">Mock completed result</div>}
    >
      <PromptPanel
        mode="image"
        title="Image generation contract"
        description="Submit the prompt payload that the image execution agent will eventually consume. The current response is a typed mock result that preserves the assigned agent id."
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
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Image requests resolve immediately in mock mode.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            The service validates the prompt contract and selected agent, then returns a completed image-generation
            result with a mock preview URL and media reference. Real model execution and persistence are intentionally
            still deferred.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
