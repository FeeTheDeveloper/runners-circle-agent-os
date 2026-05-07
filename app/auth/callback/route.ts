import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    const redirectUrl = new URL("/sign-in", requestUrl.origin);
    redirectUrl.searchParams.set("message", "Supabase auth is not configured yet.");
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    if (code) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  } catch {
    const redirectUrl = new URL("/sign-in", requestUrl.origin);
    redirectUrl.searchParams.set("error", "Unable to complete the authentication callback.");
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }
}
