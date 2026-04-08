import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

function normalizeAppUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function resolveAppUrl() {
  const explicitAppUrl = normalizeAppUrl(process.env.APP_URL);

  if (explicitAppUrl) {
    return explicitAppUrl;
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) {
    return normalizeAppUrl(`https://${vercelProductionUrl}`);
  }

  const vercelPreviewUrl = process.env.VERCEL_URL;
  if (vercelPreviewUrl) {
    return normalizeAppUrl(`https://${vercelPreviewUrl}`);
  }

  return null;
}

function isLocalhostUrl(value: string) {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function getSupabaseAdminEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = resolveAppUrl();

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

  if (process.env.NODE_ENV === "production" && isLocalhostUrl(env.appUrl)) {
    throw new Error("APP_URL no puede apuntar a localhost en producción.");
  }

  return env.appUrl;
}
