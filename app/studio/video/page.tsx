import { AppShell } from "@/components/layout/app-shell";
import { PromptPanel } from "@/components/studio/prompt-panel";

export default function StudioVideoPage() {
  return (
    <AppShell
      eyebrow="Studio / Video"
      title="Queue structured video generation jobs."
      description="The video lane is job-based by design. POST returns a queued job, the worker advances render state, and a media asset is linked on completion. The studio polls the job endpoint and exposes a manual Process Mock Step in mock mode."
      action={<div className="status-pill border-electric/20 bg-electric/10 text-electric">Job-based · async</div>}
    >
      <PromptPanel
        mode="video"
        title="Video generation contract"
        description="Submit the payload for job-based video generation. The POST returns a 202 with the queued job summary, and the panel on the right tracks status, progress, and the linked media asset."
        defaultPrompt="Produce a 15-second vertical launch teaser with a runner accelerating through charcoal fog, quick logo flashes, orange pulse graphics, and clean end-card space for campaign copy."
      />

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Job lifecycle</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">queued → processing → rendering → uploading → completed</h2>
          <div className="mt-6 space-y-3">
            {[
              "queued — accepted, awaiting a render slot",
              "processing — worker preparing prompt + assets",
              "rendering — provider rendering frames",
              "uploading — storing the rendered video in Supabase",
              "completed — generation_jobs.media_asset_id is set",
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
            Mock progression today, provider-pluggable tomorrow.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            The mock provider walks the job through every state and creates a linked media asset on completion. The
            architecture is provider-agnostic: an OpenAI or external renderer can plug in without changing the API
            shape, the studio UI, or the operator console.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
