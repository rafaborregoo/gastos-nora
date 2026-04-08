import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import type { UserThemePreference } from "@/types/database";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";
import { mergeThemeTokens } from "@/lib/theme";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isThemePreferencesTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("user_theme_preferences") === true
  );
}

export async function getCurrentUserThemePreference(): Promise<UserThemePreference | null> {
  noStore();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("user_theme_preferences").select("*").eq("user_id", user.id).maybeSingle();

  if (error) {
    if (isThemePreferencesTableMissing(error)) {
      return null;
    }

    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const record = data as Omit<UserThemePreference, "tokens"> & { tokens: Partial<UserThemePreference["tokens"]> | null };

  return {
    ...record,
    tokens: mergeThemeTokens(record.mode, record.tokens ?? {})
  };
}

