import "server-only";

import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import type { User } from "@supabase/supabase-js";

import type { Profile } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isRateLimitError(error: { status?: number; code?: string } | null) {
  return error?.status === 429 || error?.code === "over_request_rate_limit";
}

function isMissingSessionError(error: { status?: number; code?: string; message?: string } | null) {
  return (
    error?.status === 400 ||
    error?.code === "session_not_found" ||
    error?.message?.toLowerCase().includes("auth session missing") === true
  );
}

const readAuthenticatedUser = cache(async (): Promise<User | null> => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    if (isRateLimitError(error) || isMissingSessionError(error)) {
      return null;
    }

    throw new Error(error.message);
  }

  return user;
});

export async function getAuthenticatedUser() {
  noStore();
  return readAuthenticatedUser();
}

export async function getCurrentProfile(userArg?: User | null): Promise<Profile | null> {
  noStore();
  const user = userArg ?? (await getAuthenticatedUser());

  if (!user) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as Profile;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
