import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

function getSupabaseAdminEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL;

  return {
    ...getSupabaseEnv(),
    serviceRoleKey,
    appUrl
  };
}

export function hasSupabaseAdminEnv() {
  const env = getSupabaseAdminEnv();
  return Boolean(env.serviceRoleKey && env.appUrl);
}

export function hasSupabaseServiceRoleEnv() {
  const env = getSupabaseAdminEnv();
  return Boolean(env.serviceRoleKey);
}

export function createSupabaseAdminClient() {
  const env = getSupabaseAdminEnv();

  if (!env.serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getAppUrl() {
  const env = getSupabaseAdminEnv();

  if (!env.appUrl) {
    throw new Error("Falta APP_URL en el entorno del servidor.");
  }

  return env.appUrl.replace(/\/$/, "");
}
