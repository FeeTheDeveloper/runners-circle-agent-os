import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function redirectHome(request: Request) {
  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return redirectHome(request);
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    return redirectHome(request);
  }

  return redirectHome(request);
}

export async function POST(request: Request) {
  return GET(request);
}
