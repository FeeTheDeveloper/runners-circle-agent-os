import type { User } from "@supabase/supabase-js";
import { isInternalOperatorModeEnabled } from "@/lib/config/internal-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Json, ProfileRow, ProfileUpdate } from "@/lib/types/database";

export interface CurrentProfileState {
  mode: "mock" | "supabase" | "internal";
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string | null;
  } | null;
  profile: ProfileRow | null;
  error: string | null;
}

export interface UpdateProfileInput {
  full_name?: string | null;
  avatar_url?: string | null;
  role_label?: string | null;
  metadata?: Json;
}

function nowIso() {
  return new Date().toISOString();
}

function buildProfileFromUser(user: User, metadata: Json = { source: "supabase_fallback" }): ProfileRow {
  return {
    id: `fallback-${user.id}`,
    user_id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata.full_name as string | undefined) ?? null,
    avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
    role_label: "operator",
    metadata,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function getMockProfileState(): CurrentProfileState {
  const timestamp = nowIso();
  const profile: ProfileRow = {
    id: "profile_mock",
    user_id: "mock-user",
    email: "mock-operator@runnerscircle.local",
    full_name: "Mock Operator",
    avatar_url: null,
    role_label: "operator",
    metadata: {
      source: "mock_mode",
    },
    created_at: timestamp,
    updated_at: timestamp,
  };

  return {
    mode: "mock",
    isAuthenticated: false,
    user: {
      id: profile.user_id,
      email: profile.email,
    },
    profile,
    error: null,
  };
}

function getInternalProfileState(): CurrentProfileState {
  const timestamp = nowIso();
  const profile: ProfileRow = {
    id: "profile_internal_owner",
    user_id: "mock-user",
    email: "owner@runnerscircle.internal",
    full_name: "Internal Owner",
    avatar_url: null,
    role_label: "owner",
    metadata: {
      source: "internal_operator_mode",
    },
    created_at: timestamp,
    updated_at: timestamp,
  };

  return {
    mode: "internal",
    isAuthenticated: false,
    user: null,
    profile,
    error: null,
  };
}

function toProfileState(user: User | null, profile: ProfileRow | null, error: string | null = null): CurrentProfileState {
  return {
    mode: "supabase",
    isAuthenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          email: user.email ?? null,
        }
      : null,
    profile,
    error,
  };
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}

export async function getCurrentProfile(): Promise<CurrentProfileState> {
  const internalOperatorMode = isInternalOperatorModeEnabled();

  if (!isSupabaseConfigured()) {
    return internalOperatorMode ? getInternalProfileState() : getMockProfileState();
  }

  try {
    const { supabase, user, error } = await getAuthenticatedUser();

    if (error || !user) {
      return internalOperatorMode ? getInternalProfileState() : toProfileState(null, null, error?.message ?? null);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return toProfileState(user, buildProfileFromUser(user), profileError.message);
    }

    return toProfileState(user, profile ?? buildProfileFromUser(user));
  } catch {
    return internalOperatorMode ? getInternalProfileState() : getMockProfileState();
  }
}

export async function ensureProfile(): Promise<CurrentProfileState> {
  const internalOperatorMode = isInternalOperatorModeEnabled();

  if (!isSupabaseConfigured()) {
    return internalOperatorMode ? getInternalProfileState() : getMockProfileState();
  }

  try {
    const { supabase, user, error } = await getAuthenticatedUser();

    if (error || !user) {
      return internalOperatorMode ? getInternalProfileState() : toProfileState(null, null, error?.message ?? null);
    }

    const current = await getCurrentProfile();

    if (current.profile && !current.profile.id.startsWith("fallback-")) {
      return current;
    }

    const insertPayload = {
      user_id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata.full_name as string | undefined) ?? null,
      avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
      role_label: "operator",
      metadata: {
        source: "auth_bootstrap",
      },
    };

    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .upsert(insertPayload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (insertError) {
      return toProfileState(user, buildProfileFromUser(user), insertError.message);
    }

    return toProfileState(user, profile);
  } catch {
    return internalOperatorMode ? getInternalProfileState() : getMockProfileState();
  }
}

export async function updateProfile(input: UpdateProfileInput): Promise<CurrentProfileState> {
  const internalOperatorMode = isInternalOperatorModeEnabled();

  if (!isSupabaseConfigured()) {
    const mockState = internalOperatorMode ? getInternalProfileState() : getMockProfileState();

    return {
      ...mockState,
      profile: mockState.profile
        ? {
            ...mockState.profile,
            ...input,
            metadata: input.metadata ?? mockState.profile.metadata,
            updated_at: nowIso(),
          }
        : null,
    };
  }

  try {
    const { supabase, user, error } = await getAuthenticatedUser();

    if (error || !user) {
      return internalOperatorMode ? getInternalProfileState() : toProfileState(null, null, error?.message ?? null);
    }

    const payload: ProfileUpdate = {
      full_name: input.full_name,
      avatar_url: input.avatar_url,
      role_label: input.role_label,
      metadata: input.metadata,
    };

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      return toProfileState(user, buildProfileFromUser(user), updateError.message);
    }

    return toProfileState(user, profile);
  } catch {
    return internalOperatorMode ? getInternalProfileState() : getMockProfileState();
  }
}
