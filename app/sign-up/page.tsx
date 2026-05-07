import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

interface SignUpPageProps {
  searchParams: Promise<{
    next?: string;
    message?: string;
    error?: string;
  }>;
}

function getSafeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="eyebrow">
            Runners Circle Agent OS
          </Link>
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            Back to homepage
          </Link>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="panel p-6 sm:p-8">
            <p className="eyebrow">Ownership Layer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Claim your operator profile.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Account creation establishes the user record that will eventually own agent tasks, generation jobs,
              media assets, campaigns, promotion packages, and activity history in Supabase.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                "Profile bootstrap runs when the authenticated user enters the dashboard.",
                "Protected API routes return 401 JSON when a session is missing.",
                "Mock mode remains available when Supabase environment variables are not configured.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <AuthForm
            mode="sign-up"
            nextPath={getSafeNextPath(params.next)}
            initialMessage={params.message ?? params.error ?? null}
          />
        </div>
      </div>
    </main>
  );
}
