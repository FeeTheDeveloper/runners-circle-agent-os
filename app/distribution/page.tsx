import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DistributionJobCard } from "@/components/distribution/distribution-job-card";
import { PublishingStatusBadge } from "@/components/distribution/publishing-status-badge";
import { getDistributionChannelBreakdown, getDistributionJobs, getDistributionOperationalSummary, getDistributionReadinessSummary } from "@/lib/services/distribution";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getLatestApprovalRequestForEntity } from "@/lib/services/reviews";
import { getCurrentUserTeams } from "@/lib/services/teams";
import type { DistributionStatus } from "@/lib/types/distribution";

export const dynamic = "force-dynamic";

const sections: Array<{
  title: string;
  description: string;
  statuses: DistributionStatus[];
}> = [
  {
    title: "Queued jobs",
    description: "Draft and ready jobs waiting for approval, scheduling, or manual handoff.",
    statuses: ["draft", "ready"],
  },
  {
    title: "Scheduled jobs",
    description: "Jobs placed on the deployment calendar but not yet published.",
    statuses: ["scheduled", "publishing"],
  },
  {
    title: "Published jobs",
    description: "Jobs that completed a mock publish and recorded a normalized URL.",
    statuses: ["published"],
  },
  {
    title: "Failed jobs",
    description: "Jobs that need operator attention before another publish attempt.",
    statuses: ["failed", "cancelled"],
  },
];

export default async function DistributionPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const jobs = getDistributionJobs({
    teamId: currentTeam?.id ?? undefined,
  });
  const summary = getDistributionOperationalSummary({
    teamId: currentTeam?.id ?? undefined,
  });
  const readiness = getDistributionReadinessSummary({
    teamId: currentTeam?.id ?? undefined,
  });
  const channelBreakdown = getDistributionChannelBreakdown({
    teamId: currentTeam?.id ?? undefined,
  });
  const reviewRequestByJobId = Object.fromEntries(
    jobs.map((job) => [job.id, getLatestApprovalRequestForEntity("distribution_job", job.id)]),
  );
  const reviewRequiredJobs = jobs.filter((job) => {
    const reviewRequest = reviewRequestByJobId[job.id];

    if (reviewRequest?.status === "approved") {
      return false;
    }

    return job.metadata.requiresApproval === true || reviewRequest?.status === "pending_review";
  });

  return (
    <AppShell
      eyebrow="Distribution"
      title="Prepare campaigns for direct publishing and channel deployment."
      description="The distribution layer packages approved promotion outputs into publish-ready jobs for social, email, and web channels while keeping manual review, mock fallback, and server-side secret handling intact."
      action={
        <Link href="/promotions" className="status-pill border-electric/20 bg-electric/10 text-electric">
          Open promotions
        </Link>
      }
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Distribution Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Social, email, and web deployment now share one command surface.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Jobs can be scheduled, manually handed off, mock-published, or held behind reviewer approval without pretending live external publishing already exists.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
            <p className="field-label">Publishing readiness</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
                {reviewRequiredJobs.length} review-required
              </div>
              <div className="status-pill">{currentTeam?.name ?? "Single-user mode"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Queued jobs</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.readyJobs + jobs.filter((job) => job.status === "draft").length}</p>
            <p className="mt-2 text-sm text-muted">Jobs waiting for schedule, approval, or handoff.</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Scheduled jobs</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.scheduledJobs}</p>
            <p className="mt-2 text-sm text-muted">Calendar-bound deployment slots ready to fire.</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Published jobs</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.publishedJobs}</p>
            <p className="mt-2 text-sm text-muted">Completed mock publishes with normalized URLs.</p>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <p className="field-label">Failed jobs</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.failedJobs}</p>
            <p className="mt-2 text-sm text-muted">Jobs currently blocking channel deployment.</p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Channel Breakdown</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Readiness by channel</h2>
            </div>
            <div className="status-pill">{channelBreakdown.length} channels</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {channelBreakdown.map((item) => (
              <div key={item.channel} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold capitalize text-foreground">{item.channel.replaceAll("_", " ")}</p>
                    <p className="mt-2 text-sm text-muted">
                      {item.liveJobs} live or scheduled / {item.blockedJobs} blocked
                    </p>
                  </div>
                  <div className="status-pill">{item.totalJobs}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Mode Readiness</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Mock, manual, and future live lanes</h2>
            </div>
            <PublishingStatusBadge status="ready" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Mock fallback</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{readiness.mockFallbackEnabled ? "active" : "off"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Manual handoff</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{readiness.manualFallbackEnabled ? "active" : "off"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">API-ready jobs</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{readiness.apiReadyJobs}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {readiness.notes.map((note) => (
              <div key={note} className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-6 text-muted">
                {note}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-5 space-y-5">
        {sections.map((section) => {
          const items = jobs.filter((job) => section.statuses.includes(job.status));

          return (
            <article key={section.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{section.title}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-foreground">{section.description}</h2>
                </div>
                <div className="status-pill">{items.length}</div>
              </div>

              {items.length === 0 ? (
                <div className="panel mt-5 p-6">
                  <p className="text-sm text-muted">No distribution jobs are in this lane right now.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  {items.map((job) => (
                    <DistributionJobCard
                      key={job.id}
                      job={job}
                      reviewRequest={reviewRequestByJobId[job.id] ?? null}
                    />
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
