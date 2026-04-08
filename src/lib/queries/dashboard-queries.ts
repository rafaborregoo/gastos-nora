import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { buildDashboardGoals, buildDashboardTips } from "@/lib/calculations/budget-goals";
import { buildMonthlyDashboard } from "@/lib/calculations/dashboard";
import { getBudgetGoals } from "@/lib/queries/budget-goal-queries";
import { getCurrentHouseholdBundle } from "@/lib/queries/household-queries";
import { getTransactionBalances } from "@/lib/queries/transaction-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CategoryMonthlyExpenseView, MonthlySummaryView } from "@/types/database";

function getLastMonths(months: number) {
  const values: string[] = [];
  const now = new Date();
  now.setUTCDate(1);

  for (let index = months - 1; index >= 0; index -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    values.push(month.toISOString().slice(0, 10));
  }

  return values;
}

export async function getDashboardData(month: string) {
  noStore();
  const context = await getCurrentHouseholdBundle();

  if (!context) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const months = getLastMonths(6);

  const [summaryResponse, categoryResponse, pendingByTransaction, categoriesResponse, savedGoals] = await Promise.all([
    supabase
      .from("v_monthly_summary")
      .select("*")
      .eq("household_id", context.household.id)
      .gte("month", months[0]),
    supabase
      .from("v_category_monthly_expenses")
      .select("*")
      .eq("household_id", context.household.id)
      .eq("month", `${month}-01`),
    getTransactionBalances(),
    supabase
      .from("categories")
      .select("id, name, color, icon, kind")
      .eq("household_id", context.household.id)
      .order("name", { ascending: true }),
    getBudgetGoals(context.household.id)
  ]);

  if (summaryResponse.error) {
    throw new Error(summaryResponse.error.message);
  }

  if (categoryResponse.error) {
    throw new Error(categoryResponse.error.message);
  }

  if (categoriesResponse.error) {
    throw new Error(categoriesResponse.error.message);
  }

  const summaries = (summaryResponse.data as MonthlySummaryView[]) ?? [];
  const expenseByCategory = ((categoryResponse.data as CategoryMonthlyExpenseView[]) ?? []).map((item) => ({
    categoryName: item.category_name ?? "Sin categoria",
    totalAmount: item.total_amount
  }));

  const trend = months.map((currentMonth) => {
    const income =
      summaries.find((summary) => summary.month === currentMonth && summary.type === "income")?.total_amount ?? 0;
    const expense =
      summaries.find((summary) => summary.month === currentMonth && summary.type === "expense")?.total_amount ?? 0;

    return {
      month: currentMonth,
      income,
      expense
    };
  });

  const currentMonthSummaries = summaries.filter((summary) => summary.month === `${month}-01`);
  const totalExpenses = currentMonthSummaries.find((summary) => summary.type === "expense")?.total_amount ?? 0;
  const totalIncome = currentMonthSummaries.find((summary) => summary.type === "income")?.total_amount ?? 0;
  const availableGoalCategories = ((categoriesResponse.data ?? []) as Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    kind: "expense" | "income" | "both";
  }>).filter((category) => category.kind === "expense" || category.kind === "both");
  const goals = buildDashboardGoals({
    totalIncome,
    categoryExpenses: expenseByCategory,
    categories: availableGoalCategories,
    savedGoals
  });
  const { tips, savingsProgress, savingsTarget } = buildDashboardTips({
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    goals
  });

  return buildMonthlyDashboard({
    month: `${month}-01`,
    summaries,
    categoryExpenses: expenseByCategory,
    trend,
    pendingByTransaction,
    goals,
    tips,
    savingsProgress,
    savingsTarget,
    availableGoalCategories
  });
}

