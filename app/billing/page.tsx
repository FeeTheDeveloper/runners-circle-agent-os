import { BillingStatusCard } from "@/components/billing/billing-status-card";
import { PlanCard } from "@/components/billing/plan-card";
import { UpgradeCta } from "@/components/billing/upgrade-cta";
import { UsageMeter } from "@/components/billing/usage-meter";
import { AppShell } from "@/components/layout/app-shell";
import { planFeatures, planTierOrder } from "@/lib/billing/plans";
import { getBillingContextSnapshot } from "@/lib/services/billing";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getCurrentUserTeams, getTeamMembers } from "@/lib/services/teams";
import { getUsageSnapshotAsync } from "@/lib/services/usage";

export const dynamic = "force-dynamic";

function getUsedValue(limit: number | null, remaining: number | null, fallbackUsed = 0) {
  if (limit === null || remaining === null) {
    return fallbackUsed;
  }

  return Math.max(limit - remaining, 0);
}

export default async function BillingPage() {
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const teamMembers = currentTeam ? await getTeamMembers(currentTeam.id) : [];
  const seatCount = currentTeam ? teamMembers.length : 1;
  const billingContext = await getBillingContextSnapshot(userId, currentTeam?.id ?? null);
  const { billingAccount: account, currentPlan, upgradeOptions, billingReadiness: readiness } = billingContext;
  const usageSnapshot = await getUsageSnapshotAsync(userId, currentTeam?.id ?? null, seatCount);

  return (
    <AppShell
      eyebrow="Billing"
      title="Usage controls, live Stripe readiness, and subscription management."
      description="Billing now supports hosted Stripe checkout, customer portal handoff, and webhook-driven plan sync while preserving the mock-safe fallback when live env vars are missing."
    >
      <section className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <BillingStatusCard
          account={account}
          readiness={readiness}
          warningCount={usageSnapshot.warnings.length}
          teamId={currentTeam?.id ?? null}
        />

        <article className="panel-strong p-5 sm:p-6">
          <p className="eyebrow">Current Plan</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {currentPlan.planTier.charAt(0).toUpperCase() + currentPlan.planTier.slice(1)} plan coverage
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Team scope: {currentTeam?.name ?? "Single-user mode"}.{" "}
            {readiness.checkoutConnected
              ? "Hosted checkout is live for configured plans, and billing status now syncs back through verified Stripe webhooks."
              : "Usage stays soft-enforced and billing remains mock-safe until Stripe env vars and price ids are configured on the server."}
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Monthly price</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {currentPlan.monthlyPrice === null ? "Custom" : `$${currentPlan.monthlyPrice}`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Support level</p>
              <p className="mt-2 text-2xl font-semibold text-foreground capitalize">{currentPlan.supportLevel.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Seat usage</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {seatCount}
                {usageSnapshot.balance.teamSeatLimit === null ? " / unlimited" : ` / ${usageSnapshot.balance.teamSeatLimit}`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Reset date</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{usageSnapshot.balance.resetAt.slice(0, 10)}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <UsageMeter
          label="Image credits"
          used={getUsedValue(currentPlan.imageCredits, usageSnapshot.balance.imageCredits)}
          limit={currentPlan.imageCredits}
          unit="credits"
          detail="Monthly image generations before upgrade pressure."
        />
        <UsageMeter
          label="Video jobs"
          used={getUsedValue(currentPlan.videoCredits, usageSnapshot.balance.videoCredits)}
          limit={currentPlan.videoCredits}
          unit="jobs"
          detail="Queued or completed video generations this cycle."
        />
        <UsageMeter
          label="Agent tasks"
          used={getUsedValue(currentPlan.agentTaskCredits, usageSnapshot.balance.agentTaskCredits)}
          limit={currentPlan.agentTaskCredits}
          unit="tasks"
          detail="Task contracts consumed by the control plane."
        />
        <UsageMeter
          label="Workflows"
          used={getUsedValue(currentPlan.workflowCredits, usageSnapshot.balance.workflowCredits)}
          limit={currentPlan.workflowCredits}
          unit="runs"
          detail="Workflow launches counted this cycle."
        />
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <UsageMeter
          label="Storage"
          used={usageSnapshot.balance.storageUsedMb}
          limit={usageSnapshot.balance.storageLimitMb}
          unit="MB"
          detail="Uploaded and generated asset storage footprint."
        />
        <UsageMeter
          label="Campaigns"
          used={getUsedValue(currentPlan.campaignLimit, usageSnapshot.balance.campaignLimit)}
          limit={currentPlan.campaignLimit}
          unit="campaigns"
          detail="Campaign build allowance for the current cycle."
        />
        <UsageMeter
          label="Distribution jobs"
          used={getUsedValue(currentPlan.distributionLimit, usageSnapshot.balance.distributionLimit)}
          limit={currentPlan.distributionLimit}
          unit="jobs"
          detail="Scheduled or created distribution jobs this cycle."
        />
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Usage Risk</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Warnings and recent usage activity</h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
            <div className="space-y-3">
              {usageSnapshot.warnings.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-muted">No current usage risks. Soft enforcement remains active for demo and internal work.</p>
                </div>
              ) : (
                usageSnapshot.warnings.map((warning) => (
                  <div key={warning} className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                    <p className="text-sm leading-6 text-foreground">{warning}</p>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              {usageSnapshot.recentEvents.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-sm text-muted">No usage events recorded yet.</p>
                </div>
              ) : (
                usageSnapshot.recentEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-foreground">{event.type.replaceAll("_", " ")}</p>
                      <div className="status-pill">{event.amount}</div>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {event.relatedEntityType ?? "usage"}: {event.relatedEntityId ?? "unscoped"}
                    </p>
                    <p className="mt-2 text-xs text-foreground/70">{event.createdAt}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5">
        <UpgradeCta currentPlanTier={account.planTier} options={upgradeOptions} checkoutConnected={readiness.checkoutConnected} />
      </section>

      <section className="mt-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {planTierOrder.map((planTier) => (
            <PlanCard
              key={planTier}
              plan={planFeatures[planTier]}
              currentPlanTier={account.planTier}
              recommended={upgradeOptions.some((option) => option.planTier === planTier && option.recommended)}
              teamId={currentTeam?.id ?? null}
              checkoutConnected={readiness.checkoutConnected}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
