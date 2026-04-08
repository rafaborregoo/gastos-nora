import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const env = getSupabaseEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options
        });
        response.cookies.set({
          name,
          value,
          ...options
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options
        });
        response.cookies.set({
          name,
          value: "",
          ...options
        });
      }
    }
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    const authError = error as { status?: number; code?: string } | null;

    if (authError?.status !== 429 && authError?.code !== "over_request_rate_limit") {
      throw error;
    }
  }

  return response;
}
