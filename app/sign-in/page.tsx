import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

interface SignInPageProps {
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

export default async function SignInPage({ searchParams }: SignInPageProps) {
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
            <p className="eyebrow">Auth Lock</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Protected ownership starts here.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              The dashboard, studio, campaigns, promotions, media library, and operator console are ready to move
              from mock visibility toward authenticated ownership without removing local mock mode.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                "Email and password sign-in through Supabase Auth.",
                "Route protection for pages and API handlers when Supabase is configured.",
                "Profile bootstrap ready for dashboard entry.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <AuthForm
            mode="sign-in"
            nextPath={getSafeNextPath(params.next)}
            initialMessage={params.message ?? params.error ?? null}
          />
        </div>
      </div>
    </main>
  );
}
