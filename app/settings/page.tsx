import Link from "next/link";
import { BrandModeBadges } from "@/components/brand/brand-mode-badges";
import { BillingStatusCard } from "@/components/billing/billing-status-card";
import { UpgradeCta } from "@/components/billing/upgrade-cta";
import { UsageMeter } from "@/components/billing/usage-meter";
import { AppShell } from "@/components/layout/app-shell";
import { BrandProfilePanel } from "@/components/settings/brand-profile-panel";
import { getBrandModeSettings, getBrandProfile } from "@/lib/services/brand";
import { getBillingAccount, getBillingReadiness, getCurrentPlan, getUpgradeOptions } from "@/lib/services/billing";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getCurrentUserTeams, getTeamMembers } from "@/lib/services/teams";
import { getUsageSnapshot } from "@/lib/services/usage";
import { getRuntimeStatus } from "@/lib/supabase/server";

const envVars = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "MEDIA_STORAGE_BUCKET",
  "MEDIA_THUMBNAILS_BUCKET",
  "CAMPAIGN_EXPORTS_BUCKET",
  "MEDIA_STORAGE_PROVIDER",
];

export const dynamic = "force-dynamic";

function getUsedValue(limit: number | null, remaining: number | null, fallbackUsed = 0) {
  if (limit === null || remaining === null) {
    return fallbackUsed;
  }

  return Math.max(limit - remaining, 0);
}

export default async function SettingsPage() {
  const status = getRuntimeStatus();
  const currentProfile = await getCurrentProfile();
  const userId = currentProfile.user?.id ?? currentProfile.profile?.user_id ?? "mock-user";
  const teams = await getCurrentUserTeams(userId);
  const currentTeam = teams[0] ?? null;
  const teamMembers = currentTeam ? await getTeamMembers(currentTeam.id) : [];
  const usageSnapshot = getUsageSnapshot(userId, currentTeam?.id ?? null, currentTeam ? teamMembers.length : 1);
  const billingAccount = getBillingAccount(userId, currentTeam?.id ?? null);
  const billingReadiness = getBillingReadiness();
  const currentPlan = getCurrentPlan(userId, currentTeam?.id ?? null);
  const upgradeOptions = getUpgradeOptions(userId, currentTeam?.id ?? null);
  const brandProfile = getBrandProfile(userId);
  const brandModeSettings = getBrandModeSettings(userId);
  const authStatus = !status.supabase
    ? "Mock mode"
    : currentProfile.isAuthenticated
      ? "Signed in"
      : "Configured, waiting for session";

  return (
    <AppShell
      eyebrow="Settings"
      title="Configuration, auth lock, and runtime readiness."
      description="Settings tracks the shift from mock-only scaffolding toward authenticated ownership and database-backed persistence without exposing sensitive credentials."
      action={
        <Link
          href={currentProfile.isAuthenticated ? "/sign-out" : "/sign-in"}
          className="inline-flex items-center rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft"
        >
          {currentProfile.isAuthenticated ? "Sign out" : "Open sign in"}
        </Link>
      }
    >
      <section className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Runtime Status</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Current environment signals</h2>
          <div className="mt-5">
            <BrandModeBadges active={brandModeSettings.enabled} profileName={brandProfile.name} tone={brandProfile.tone} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              { label: "Auth status", value: authStatus },
              { label: "Supabase connection", value: status.supabase ? "Ready" : "Pending" },
              { label: "Storage readiness", value: status.storageReady ? "Ready" : "Pending" },
              { label: "OpenAI key", value: status.openAi ? "Ready" : "Pending" },
              { label: "Agent pipeline", value: status.agentPipeline ? "Ready" : "Pending" },
              { label: "Storage provider", value: status.storageProvider },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="field-label">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Current Operator</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">User and profile placeholder</h2>
          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Mode</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{currentProfile.mode}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                {currentProfile.mode === "mock"
                  ? "Mock mode remains available until Supabase auth is configured."
                  : "Supabase session state now determines access to protected routes."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Email</p>
              <p className="mt-2 text-sm font-medium text-foreground">{currentProfile.user?.email ?? "No authenticated user"}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <p className="field-label">Profile</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {currentProfile.profile?.full_name ?? currentProfile.profile?.role_label ?? "Profile pending"}
              </p>
              <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-foreground/70">
                {currentProfile.profile?.user_id ?? currentProfile.user?.id ?? "user-unavailable"}
              </p>
            </div>
            {currentProfile.error ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                <p className="field-label text-warning">Profile note</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{currentProfile.error}</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <BillingStatusCard account={billingAccount} readiness={billingReadiness} warningCount={usageSnapshot.warnings.length} />

        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Usage Controls</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Soft billing enforcement for the current environment</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <UsageMeter
              label="Agent tasks"
              used={getUsedValue(currentPlan.agentTaskCredits, usageSnapshot.balance.agentTaskCredits)}
              limit={currentPlan.agentTaskCredits}
              unit="tasks"
              detail="Task volume remains soft-enforced in mock and internal mode."
            />
            <UsageMeter
              label="Workflows"
              used={getUsedValue(currentPlan.workflowCredits, usageSnapshot.balance.workflowCredits)}
              limit={currentPlan.workflowCredits}
              unit="runs"
              detail="Workflow launches stay allowed, but upgrade hints surface when the runway gets short."
            />
          </div>
        </article>
      </section>

      <section className="mt-5">
        <BrandProfilePanel initialBrandProfile={brandProfile} initialBrandModeSettings={brandModeSettings} />
      </section>

      <section className="mt-5">
        <UpgradeCta currentPlanTier={billingAccount.planTier} options={upgradeOptions} compact />
      </section>

      <section className="mt-5">
        <article className="panel p-5 sm:p-6">
          <p className="eyebrow">Environment Contract</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Required variables for first run</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {envVars.map((variable) => (
              <div key={variable} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="font-[family-name:var(--font-mono)] text-sm text-foreground">{variable}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
