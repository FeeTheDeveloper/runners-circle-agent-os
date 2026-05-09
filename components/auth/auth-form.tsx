"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  nextPath?: string | null;
  initialMessage?: string | null;
  internalOperatorMode?: boolean;
}

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-orange/40";

function getSafeNextPath(nextPath?: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

function getCallbackUrl(nextPath: string) {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export function AuthForm({ mode, nextPath, initialMessage, internalOperatorMode = false }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(initialMessage ?? null);
  const isConfigured = isBrowserSupabaseConfigured();
  const safeNextPath = getSafeNextPath(nextPath);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setStatus("error");
      setFeedback("Supabase auth is not configured yet. The app is still running in mock mode.");
      return;
    }

    setStatus("loading");
    setFeedback(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setStatus("error");
          setFeedback(error.message);
          return;
        }

        setStatus("success");
        router.push(safeNextPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getCallbackUrl(safeNextPath),
        },
      });

      if (error) {
        setStatus("error");
        setFeedback(error.message);
        return;
      }

      setStatus("success");

      if (data.session) {
        router.push(safeNextPath);
        router.refresh();
        return;
      }

      setFeedback("Account created. Check your inbox to complete the email confirmation step.");
    } catch {
      setStatus("error");
      setFeedback(mode === "sign-in" ? "Unable to sign in right now." : "Unable to create your account right now.");
    }
  }

  return (
    <div className="panel-strong w-full max-w-xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{mode === "sign-in" ? "Sign In" : "Sign Up"}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {internalOperatorMode
              ? mode === "sign-in"
                ? "Optional auth for the private command layer."
                : "Add a persisted operator identity."
              : mode === "sign-in"
                ? "Re-enter the command room."
                : "Create your operator account."}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            {internalOperatorMode
              ? mode === "sign-in"
                ? "Internal owner mode already unlocks the platform. Sign in only if you want Supabase-backed identity, persisted ownership, and future database-linked history."
                : "Create a Supabase-backed identity for persistence and ownership tracking without changing the internal operator bypass."
              : mode === "sign-in"
                ? "Use your email and password to unlock protected routes and take ownership of tasks, media, campaigns, and promotions."
                : "Create a Supabase-backed operator identity so the platform can attach ownership to the pipeline as persistence comes online."}
          </p>
        </div>

        <div className="rounded-2xl border border-orange/20 bg-orange/10 p-3 text-orange-soft">
          <ShieldCheck className="size-5" />
        </div>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor={`${mode}-email`} className="field-label">
            Email
          </label>
          <input
            id={`${mode}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operator@runnerscircle.com"
            className={fieldClassName}
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor={`${mode}-password`} className="field-label">
            Password
          </label>
          <input
            id={`${mode}-password`}
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Use a secure password"
            className={fieldClassName}
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-black transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading"
            ? mode === "sign-in"
              ? "Signing in..."
              : "Creating account..."
            : mode === "sign-in"
              ? "Sign in"
              : "Sign up"}
          <ArrowRight className="size-4" />
        </button>
      </form>

      {feedback ? (
        <div
          className={
            status === "error"
              ? "mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground"
              : "mt-5 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-foreground"
          }
        >
          {feedback}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <p className="text-sm text-muted">
          {internalOperatorMode
            ? mode === "sign-in"
              ? "Need persistent auth?"
              : "Already have persistent auth?"
            : mode === "sign-in"
              ? "Need an account?"
              : "Already have an account?"}
        </p>
        <Link
          href={mode === "sign-in" ? `/sign-up?next=${encodeURIComponent(safeNextPath)}` : `/sign-in?next=${encodeURIComponent(safeNextPath)}`}
          className="text-sm font-medium text-electric transition hover:text-electric/80"
        >
          {mode === "sign-in" ? "Create account" : "Open sign in"}
        </Link>
      </div>
    </div>
  );
}
