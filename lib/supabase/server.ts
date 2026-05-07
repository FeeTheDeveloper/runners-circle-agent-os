import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabasePublicEnv,
  getSupabaseServiceEnv,
} from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

export { getRuntimeStatus, isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase server client is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieValues) {
        try {
          cookieValues.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read auth cookies without mutating the outgoing response.
        }
      },
    },
  });
}

export function createSupabaseServiceRoleClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseServiceEnv();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role client is not configured.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
