import Link from "next/link";
import { ArrowRight, AudioWaveform, Bot, Film, FolderKanban, Sparkles } from "lucide-react";
import { getRuntimeStatus } from "@/lib/supabase/server";

const productLanes = [
  {
    title: "Workflows",
    description: "Launch reusable multi-agent runs that keep sequencing, packaging, and operator checkpoints visible from one command layer.",
    icon: FolderKanban,
  },
  {
    title: "Agents",
    description: "Direct the execution roster with explicit task contracts, handoff awareness, and operator-grade routing visibility.",
    icon: Bot,
  },
  {
    title: "Distribution Queue",
    description: "Move approved assets and campaigns into manual or mock delivery lanes without turning the platform into a public SaaS funnel.",
    icon: Sparkles,
  },
];

const workflow = [
  "Workflow launch",
  "Agent assignment",
  "Generation queue",
  "Media state",
  "Campaign packaging",
  "Distribution queue",
];

export default function HomePage() {
  const status = getRuntimeStatus();

  return (
    <main className="relative overflow-hidden px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-8">
        <section className="panel-strong relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top,rgba(255,112,38,0.18),transparent_34%),radial-gradient(circle_at_80%_40%,rgba(31,219,255,0.14),transparent_26%)] lg:block" />
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-8">
              <div
                className={
                  status.internalOperatorMode
                    ? "status-pill w-fit border-electric/20 bg-electric/10 text-electric"
                    : "status-pill w-fit border-orange/25 bg-orange/10 text-orange-soft"
                }
              >
                {status.internalOperatorMode ? "Private internal operator mode" : "AI-native command infrastructure"}
              </div>
              <div className="space-y-4">
                <p className="eyebrow">Runners Circle Agent OS</p>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                  Run private command infrastructure for workflows, agents, media, campaigns, and distribution.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  This control panel is designed for owner-run internal operations: workflow launches, agent tasking,
                  generation orchestration, media state, campaign assembly, and queue-based distribution from one surface.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft"
                >
                  Enter Dashboard
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/workflows"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-foreground transition hover:border-electric/50 hover:bg-white/[0.08]"
                >
                  Open Workflows
                  <Film className="size-4" />
                </Link>
              </div>
            </div>
            <div className="panel relative overflow-hidden border-white/12 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="eyebrow">Primary Workflow</p>
                  <h2 className="mt-2 text-2xl font-semibold">Command Flow</h2>
                </div>
                <AudioWaveform className="size-10 text-electric" />
              </div>
              <div className="mt-5 space-y-3">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm text-muted">0{index + 1}</span>
                    <span className="font-medium text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {productLanes.map((lane) => {
            const Icon = lane.icon;

            return (
              <article key={lane.title} className="panel interactive-border p-6">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">{lane.title}</p>
                  <Icon className="size-5 text-orange" />
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">{lane.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{lane.description}</p>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
