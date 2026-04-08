"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { errorResult, handleActionError, successResult, type ActionResult } from "@/lib/actions/shared";

export async function signInAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = loginSchema.parse(values);
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password
    });

    if (error) {
      return errorResult(error.message);
    }

    return successResult("Sesion iniciada.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function signUpAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = registerSchema.parse(values);
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: {
          full_name: parsed.fullName
        }
      }
    });

    if (error) {
      return errorResult(error.message);
    }

    return successResult("Cuenta creada. Ya puedes entrar en la app.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return errorResult(error.message);
    }

    return successResult("Sesion cerrada.");
  } catch (error) {
    return handleActionError(error);
  }
}

