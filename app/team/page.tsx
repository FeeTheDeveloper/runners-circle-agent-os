import { AppShell } from "@/components/layout/app-shell";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { TeamRoleBadge } from "@/components/team/team-role-badge";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getCurrentUserTeams, getTeamMembers } from "@/lib/services/teams";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const members = currentTeam ? await getTeamMembers(currentTeam.id) : [];
  const currentMember = members.find((member) => member.userId === userId) ?? null;
  const canManage = currentTeam ? currentTeam.ownerUserId === userId || currentMember?.role === "admin" : false;
  const activeOperators = members.filter((member) => ["owner", "admin", "operator"].includes(member.role));
  const reviewers = members.filter((member) => ["owner", "admin", "reviewer"].includes(member.role));

  return (
    <AppShell
      eyebrow="Team Command Layer"
      title="Manage the people behind the operating system."
      description="Teams add shared ownership, role boundaries, operator assignments, and reviewer coverage without removing single-user mode."
    >
      {!currentTeam ? (
        <section className="panel p-6">
          <p className="eyebrow">Empty State</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">No team is connected yet.</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            The command layer can still run in single-user mode until a team is created or synced from Supabase.
          </p>
        </section>
      ) : (
        <>
          <section className="panel-strong p-5 sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow">Current Team</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{currentTeam.name}</h2>
                <p className="mt-4 text-sm leading-7 text-muted">
                  Team roles define who can operate, edit, review, or just observe the shared campaign, workflow, and agent execution stack.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-black/20 px-5 py-4">
                <p className="field-label">Command layer state</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="status-pill border-electric/20 bg-electric/10 text-electric">{members.length} members</div>
                  <div className="status-pill">{activeOperators.length} active operators</div>
                  <TeamRoleBadge role={currentMember?.role ?? "viewer"} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="field-label">Slug</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{currentTeam.slug}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="field-label">Owner</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{currentTeam.ownerUserId}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <p className="field-label">Reviewer seats</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{reviewers.length}</p>
              </div>
            </div>
          </section>

          {canManage ? (
            <section className="mt-5">
              <InviteMemberForm teamId={currentTeam.id} />
            </section>
          ) : null}

          <section className="mt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Members</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Roles across the command layer</h2>
              </div>
              <div className="status-pill">{members.length}</div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} canManage={canManage} currentUserId={userId} />
              ))}
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <article className="panel p-5 sm:p-6">
              <p className="eyebrow">Operator Assignments</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Who can move work forward</h2>
              <div className="mt-6 space-y-3">
                {activeOperators.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.userId}</p>
                        <p className="mt-2 text-sm text-muted">Operator coverage for workflows, routing, and launch triage.</p>
                      </div>
                      <TeamRoleBadge role={member.role} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel p-5 sm:p-6">
              <p className="eyebrow">Review Coverage</p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Who can approve or request changes</h2>
              <div className="mt-6 space-y-3">
                {reviewers.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{member.userId}</p>
                        <p className="mt-2 text-sm text-muted">Review ownership for campaign, workflow, media, promotion, distribution, and execution approvals.</p>
                      </div>
                      <TeamRoleBadge role={member.role} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </AppShell>
  );
}
