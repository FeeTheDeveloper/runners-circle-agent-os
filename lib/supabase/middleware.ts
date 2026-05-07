import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

export interface SupabaseMiddlewareResult {
  response: NextResponse;
  user: User | null;
  isConfigured: boolean;
}

export async function refreshSupabaseSession(request: NextRequest): Promise<SupabaseMiddlewareResult> {
  if (!isSupabaseConfigured()) {
    return {
      response: NextResponse.next({ request }),
      user: null,
      isConfigured: false,
    };
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: NextResponse.next({ request }),
      user: null,
      isConfigured: false,
    };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookieValues) {
        cookieValues.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookieValues.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      response,
      user,
      isConfigured: true,
    };
  } catch {
    return {
      response,
      user: null,
      isConfigured: true,
    };
  }
}
