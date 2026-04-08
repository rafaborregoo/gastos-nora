"use server";

import { getAuthenticatedUser } from "@/lib/queries/auth-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildThemeTokensFromControls, mergeThemeTokens } from "@/lib/theme";
import { themeSettingsSchema, generateThemeSchema } from "@/lib/validators/theme";
import { generateThemeWithOpenAi, isAiThemeGenerationEnabled } from "@/lib/openai";
import {
  errorResult,
  handleActionError,
  revalidateAppPaths,
  successResult,
  type ActionResult
} from "@/lib/actions/shared";

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

async function persistThemePreference(params: {
  userId: string;
  mode: "light" | "dark";
  themeName: string | null;
  source: "manual" | "ai";
  prompt: string | null;
  tokens: ReturnType<typeof mergeThemeTokens>;
}) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("user_theme_preferences").upsert(
    {
      user_id: params.userId,
      mode: params.mode,
      theme_name: params.themeName,
      source: params.source,
      prompt: params.prompt,
      tokens: params.tokens
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isThemePreferencesTableMissing(error)) {
      throw new Error(
        "Falta la tabla user_theme_preferences en Supabase. Ejecuta primero el SQL documentado en README."
      );
    }

    throw new Error(error.message);
  }
}

export async function saveUserThemeAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = themeSettingsSchema.parse(values);
    const user = await getAuthenticatedUser();

    if (!user) {
      return errorResult("Debes iniciar sesion para guardar tu tema.");
    }

    const tokens = buildThemeTokensFromControls({
      mode: parsed.mode,
      primary: parsed.primary,
      secondary: parsed.secondary,
      accent: parsed.accent,
      background: parsed.background,
      foreground: parsed.foreground,
      border: parsed.border
    });

    await persistThemePreference({
      userId: user.id,
      mode: parsed.mode,
      themeName: parsed.themeName?.trim() || "Tema personalizado",
      source: "manual",
      prompt: null,
      tokens
    });

    revalidateAppPaths();
    return successResult("Tema guardado.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function resetUserThemeAction(): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return errorResult("Debes iniciar sesion para restaurar el tema.");
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("user_theme_preferences").delete().eq("user_id", user.id);

    if (error) {
      if (isThemePreferencesTableMissing(error)) {
        return errorResult(
          "Falta la tabla user_theme_preferences en Supabase. Ejecuta primero el SQL documentado en README."
        );
      }

      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult("Tema restaurado al estilo por defecto.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function generateUserThemeWithAiAction(values: unknown): Promise<ActionResult<{ themeName: string }>> {
  try {
    if (!isAiThemeGenerationEnabled()) {
      return errorResult("La generacion de temas con IA esta desactivada temporalmente.");
    }

    const parsed = generateThemeSchema.parse(values);
    const user = await getAuthenticatedUser();

    if (!user) {
      return errorResult("Debes iniciar sesion para generar un tema con IA.");
    }

    const generated = await generateThemeWithOpenAi(parsed.prompt);

    await persistThemePreference({
      userId: user.id,
      mode: generated.mode,
      themeName: generated.themeName,
      source: "ai",
      prompt: parsed.prompt,
      tokens: generated.tokens
    });

    revalidateAppPaths();
    return successResult(`Tema IA aplicado: ${generated.themeName}.`, {
      themeName: generated.themeName
    });
  } catch (error) {
    return handleActionError(error);
  }
}
