"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/lib/types/database";

let browserClient: SupabaseClient<Database> | null = null;

export function isBrowserSupabaseConfigured() {
  return isSupabaseConfigured();
}

export function createSupabaseBrowserClient() {
  if (!isBrowserSupabaseConfigured()) {
    throw new Error("Supabase browser client is not configured.");
  }

  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser client is missing public environment variables.");
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
