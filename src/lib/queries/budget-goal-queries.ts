import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import type { BudgetGoal } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentHouseholdBundle } from "@/lib/queries/household-queries";

function isBudgetGoalsTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.code === "42501" ||
    error.message?.toLowerCase().includes("household_budget_goals") === true
  );
}

export async function getBudgetGoals(householdId?: string) {
  noStore();
  const context = await getCurrentHouseholdBundle();
  const id = householdId ?? context?.household.id;

  if (!id) {
    return [] satisfies BudgetGoal[];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("household_budget_goals")
    .select("*, category:categories(id, name, color, icon, kind)")
    .eq("household_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    if (isBudgetGoalsTableMissing(error)) {
      return [] satisfies BudgetGoal[];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as unknown[]).map((goal) => {
    const record = goal as BudgetGoal & {
      category:
        | Array<{
            id: string;
            name: string;
            color: string | null;
            icon: string | null;
            kind: "expense" | "income" | "both";
          }>
        | {
            id: string;
            name: string;
            color: string | null;
            icon: string | null;
            kind: "expense" | "income" | "both";
          }
        | null;
    };

    return {
      ...record,
      category: Array.isArray(record.category) ? record.category[0] ?? null : record.category
    };
  });
}

