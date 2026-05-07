import { AppShell } from "@/components/layout/app-shell";
import { PromptPanel } from "@/components/studio/prompt-panel";

export default function StudioVideoPage() {
  return (
    <AppShell
      eyebrow="Studio / Video"
      title="Queue structured video generation jobs."
      description="This lane captures the motion brief and returns a queued video job contract so the future render provider and worker layer can plug in without changing the Studio interface."
      action={<div className="status-pill border-electric/20 bg-electric/10 text-electric">Queued job result</div>}
    >
      <PromptPanel
        mode="video"
        title="Video generation contract"
        description="Submit the payload for job-based video generation. The current response is queued by design and includes the selected agent id for the future execution bridge."
        defaultPrompt="Produce a 15-second vertical launch teaser with a runner accelerating through charcoal fog, quick logo flashes, orange pulse graphics, and clean end-card space for campaign copy."
      />

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Motion Notes</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">What the queued job contract should include</h2>
          <div className="mt-6 space-y-3">
            {[
              "Prompt language and motion brief",
              "Duration as an explicit job parameter",
              "Video format for delivery planning",
              "Brand mode toggle for platform tone",
              "Assigned agent id for the execution bridge",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Current Behavior</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Video requests return queued jobs, not instant renders.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            The service validates the motion contract and selected agent, then returns a queued video result with a
            mock thumbnail and job reference. This keeps the interface stable for future worker-based execution.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
