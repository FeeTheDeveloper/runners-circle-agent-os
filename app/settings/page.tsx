import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/services/profiles";
import { getRuntimeStatus } from "@/lib/supabase/server";

const envVars = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "MEDIA_STORAGE_BUCKET",
  "MEDIA_STORAGE_PROVIDER",
];

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const status = getRuntimeStatus();
  const currentProfile = await getCurrentProfile();
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
