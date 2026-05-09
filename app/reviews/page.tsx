import { AppShell } from "@/components/layout/app-shell";
import { ReviewCard } from "@/components/reviews/review-card";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getApprovalRequestSummaries } from "@/lib/services/reviews";
import { getCurrentUserTeams, getTeamMembers } from "@/lib/services/teams";
import type { ReviewStatus } from "@/lib/types/team";

export const dynamic = "force-dynamic";

const reviewSections: Array<{
  key: ReviewStatus;
  title: string;
  description: string;
}> = [
  {
    key: "pending_review",
    title: "Pending approvals",
    description: "Items waiting on a reviewer decision.",
  },
  {
    key: "changes_requested",
    title: "Requests needing changes",
    description: "Items returned for revision before they can move forward.",
  },
  {
    key: "approved",
    title: "Approved items",
    description: "Items cleared for the next command-layer step.",
  },
  {
    key: "rejected",
    title: "Rejected items",
    description: "Items intentionally stopped until a new review cycle starts.",
  },
];

export default async function ReviewsPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const members = currentTeam ? await getTeamMembers(currentTeam.id) : [];
  const currentMember = members.find((member) => member.userId === userId) ?? null;
  const canReview = currentTeam
    ? currentTeam.ownerUserId === userId || ["admin", "operator", "reviewer"].includes(currentMember?.role ?? "")
    : true;
  const requests = getApprovalRequestSummaries({
    teamId: currentTeam?.id ?? undefined,
  });

  return (
    <AppShell
      eyebrow="Reviews"
      title="Approve work across the full command layer."
      description="The review surface tracks pending approvals, changes requests, and final decisions across media, campaigns, promotions, distribution jobs, workflows, and execution packages."
    >
      <section className="panel-strong p-5 sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Review System</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Team approvals are now part of the operating model.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Request review from workflows, campaigns, promotions, media, or execution packages and record the decision back into the shared command layer.
              Distribution jobs use the same approval surface before deployment moves forward.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
            <p className="field-label">Review state</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="status-pill border-orange/20 bg-orange/10 text-orange-soft">
                {requests.filter((request) => request.status === "pending_review").length} pending
              </div>
              <div className="status-pill">{currentTeam?.name ?? "Single-user mode"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reviewSections.map((section) => (
            <div key={section.key} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <p className="field-label">{section.title}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {requests.filter((request) => request.status === section.key).length}
              </p>
              <p className="mt-2 text-sm text-muted">{section.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 space-y-5">
        {reviewSections.map((section) => {
          const sectionItems = requests.filter((request) => request.status === section.key);

          return (
            <article key={section.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{section.title}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-foreground">{section.description}</h2>
                </div>
                <div className="status-pill">{sectionItems.length}</div>
              </div>

              {sectionItems.length === 0 ? (
                <div className="panel mt-5 p-6">
                  <p className="text-sm text-muted">No items are currently in this review state.</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  {sectionItems.map((request) => (
                    <ReviewCard key={request.id} request={request} canReview={canReview} />
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
