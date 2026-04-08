"use server";

import { budgetGoalSchema } from "@/lib/validators/budget-goals";
import { getAppContext } from "@/lib/queries/household-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  errorResult,
  handleActionError,
  revalidateAppPaths,
  successResult,
  type ActionResult
} from "@/lib/actions/shared";

function isBudgetGoalsTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("household_budget_goals") === true
  );
}

export async function upsertBudgetGoalAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = budgetGoalSchema.parse(values);
    const { user, householdBundle } = await getAppContext();

    if (!user || !householdBundle) {
      return errorResult("Necesitas un hogar activo.");
    }

    const supabase = createServerSupabaseClient();
    const payload = {
      household_id: householdBundle.household.id,
      category_id: parsed.categoryId,
      created_by: user.id,
      period: "monthly" as const,
      target_percent: parsed.targetPercent ?? null,
      target_amount: parsed.targetAmount,
      note: parsed.note?.trim() || null,
      is_active: true
    };

    const mutation = parsed.id
      ? supabase.from("household_budget_goals").update(payload).eq("id", parsed.id)
      : supabase.from("household_budget_goals").upsert(payload, {
          onConflict: "household_id,category_id"
        });
    const { error } = await mutation;

    if (error) {
      if (isBudgetGoalsTableMissing(error)) {
        return errorResult(
          "Para guardar objetivos del dashboard debes crear primero la tabla household_budget_goals en Supabase."
        );
      }

      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult(parsed.id ? "Objetivo actualizado." : "Objetivo guardado.");
  } catch (error) {
    return handleActionError(error);
  }
}
