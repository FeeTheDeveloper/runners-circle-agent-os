import Link from "next/link";
import { ArrowRight, Bot, ImagePlus, Video } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

export default function StudioPage() {
  return (
    <AppShell
      eyebrow="Studio"
      title="Choose the generation lane, assign an agent, and return a typed mock result."
      description="Studio is now the contract layer between the UI and the existing ChatGPT Agent roster: image requests complete instantly in mock mode, while video requests return queued job contracts."
      action={
        <div className="flex gap-3">
          <Link href="/studio/image" className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
            Image Studio
          </Link>
          <Link href="/studio/video" className="status-pill border-electric/20 bg-electric/10 text-electric">
            Video Studio
          </Link>
        </div>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel-strong p-5 sm:p-6">
          <p className="eyebrow">Studio Overview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Direct generation requests, shaped for the agent execution layer.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            The Studio surface captures the creative brief, tags the assigned ChatGPT Agent, and returns a consistent
            generation contract before real model execution, storage, or database persistence are introduced.
          </p>

          <div className="mt-6 grid gap-3">
            {[
              "Prompt input is collected in the Studio lane.",
              "The selected agentId is included in the payload.",
              "The API route validates the request contract.",
              "The service returns a mock generation result for the dashboard-ready state.",
            ].map((step) => (
              <div key={step} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-5">
          <Link href="/studio/image" className="panel interactive-border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Image Studio</p>
              <ImagePlus className="size-5 text-orange" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">Generate still-image contracts</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Prompt, style, aspect ratio, brand mode, and assigned agent feed a mock completed image result.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-soft">
              Open image lane
              <ArrowRight className="size-4" />
            </div>
          </Link>

          <Link href="/studio/video" className="panel interactive-border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Video Studio</p>
              <Video className="size-5 text-electric" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">Queue video job contracts</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Prompt, motion style, duration, format, brand mode, and assigned agent return a queued job contract.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-electric">
              Open video lane
              <ArrowRight className="size-4" />
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Agent-Assisted</p>
            <Bot className="size-5 text-orange-soft" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">The app assigns. The agents execute.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Studio does not impersonate the live ChatGPT Agents. It prepares their inputs and preserves the output
            contract that the rest of the platform can trust.
          </p>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Image Behavior</p>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Instant mock completion</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            The image lane validates the payload and returns a mock completed generation result with a thumbnail, media
            reference, timestamp, and assigned agent id.
          </p>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Video Behavior</p>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">Queued by design</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Video is treated as a job-based lane from day one, so the response returns a queued contract ready for a
            future worker or render provider.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
