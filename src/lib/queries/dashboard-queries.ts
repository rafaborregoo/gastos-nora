import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { buildDashboardGoals, buildDashboardTips } from "@/lib/calculations/budget-goals";
import { buildAnalysisScopes, buildMonthlyDashboard } from "@/lib/calculations/dashboard";
import { calculateMemberBalances } from "@/lib/calculations/transactions";
import { getBudgetGoals } from "@/lib/queries/budget-goal-queries";
import { getAccounts, getAppContext } from "@/lib/queries/household-queries";
import { getTransactionBalances, getTransactions } from "@/lib/queries/transaction-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MonthlySummaryView } from "@/types/database";

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

function isTransactionInMonth(transactionDate: string, monthStart: string, monthEnd: string) {
  return transactionDate >= monthStart && transactionDate < monthEnd;
}

export async function getDashboardData(month: string) {
  noStore();
  const { user, householdBundle: context } = await getAppContext();

  if (!context) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const months = getLastMonths(6);
  const currentMonthStart = `${month}-01`;
  const nextMonth = new Date(`${currentMonthStart}T00:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const currentMonthEnd = nextMonth.toISOString().slice(0, 10);

  const [pendingByTransaction, categoriesResponse, savedGoals, allVisibleTransactions, visibleAccounts] = await Promise.all([
    getTransactionBalances(),
    supabase
      .from("categories")
      .select("id, name, color, icon, kind")
      .eq("household_id", context.household.id)
      .order("name", { ascending: true }),
    getBudgetGoals(context.household.id),
    getTransactions(),
    getAccounts(context.household.id, { includeInactive: true })
  ]);

  if (categoriesResponse.error) {
    throw new Error(categoriesResponse.error.message);
  }

  const currentMonthTransactions = allVisibleTransactions.filter((transaction) =>
    isTransactionInMonth(transaction.transaction_date, currentMonthStart, currentMonthEnd)
  );

  const analysisScopes = buildAnalysisScopes({
    currentMonth: currentMonthStart,
    trendMonths: months,
    accounts: visibleAccounts,
    transactions: allVisibleTransactions,
    currentUserId: user?.id
  });

  const overviewScope = analysisScopes[0];
  const totalExpenses = overviewScope?.totalExpenses ?? 0;
  const totalIncome = overviewScope?.totalIncome ?? 0;
  const expenseByCategory = overviewScope?.expenseByCategory ?? [];
  const trend = (overviewScope?.monthlyTrend ?? []).map((item) => ({
    month: item.month,
    income: item.income,
    expense: item.expense
  }));
  const summaries: MonthlySummaryView[] = months.flatMap((monthStart) => {
    const monthScope = overviewScope?.monthlyTrend.find((item) => item.month === monthStart);

    return [
      {
        household_id: context.household.id,
        month: monthStart,
        type: "income",
        total_amount: monthScope?.income ?? 0
      },
      {
        household_id: context.household.id,
        month: monthStart,
        type: "expense",
        total_amount: monthScope?.expense ?? 0
      }
    ];
  });

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

  const balances = calculateMemberBalances(
    allVisibleTransactions.map((transaction) => ({
      transaction,
      splits: transaction.splits,
      settlements: transaction.settlements
    }))
  );

  const memberStats = context.members.map((member) => {
    const currentMonthCreatedTransactions = currentMonthTransactions.filter((transaction) => transaction.created_by === member.user_id);
    const lastCreatedTransaction = allVisibleTransactions
      .filter((transaction) => transaction.created_by === member.user_id)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];

    return {
      userId: member.user_id,
      label: member.profile?.full_name ?? member.profile?.email ?? member.user_id,
      role: member.role,
      totalPaidExpenses: currentMonthTransactions
        .filter((transaction) => transaction.type === "expense" && transaction.paid_by_user_id === member.user_id)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      totalRecordedIncome: currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === "income" &&
            (transaction.beneficiary_user_id === member.user_id ||
              (!transaction.beneficiary_user_id && transaction.paid_by_user_id === member.user_id))
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      netPosition: balances.get(member.user_id) ?? 0,
      recordedTransactions: currentMonthCreatedTransactions.length,
      lastActivityAt: lastCreatedTransaction?.created_at ?? null
    };
  });

  const myCreatedTransactions = user
    ? currentMonthTransactions.filter((transaction) => transaction.created_by === user.id)
    : [];
  const myExpenses = user
    ? currentMonthTransactions
        .filter((transaction) => transaction.type === "expense" && transaction.paid_by_user_id === user.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    : 0;
  const myIncome = user
    ? currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === "income" &&
            (transaction.beneficiary_user_id === user.id ||
              (!transaction.beneficiary_user_id && transaction.paid_by_user_id === user.id))
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0)
    : 0;
  const myLastActivity = user
    ? allVisibleTransactions
        .filter((transaction) => transaction.created_by === user.id)
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]?.created_at ?? null
    : null;

  return buildMonthlyDashboard({
    month: currentMonthStart,
    summaries,
    categoryExpenses: expenseByCategory,
    trend,
    pendingByTransaction,
    myExpenses,
    myIncome,
    myRecordedTransactions: myCreatedTransactions.length,
    myLastActivityAt: myLastActivity,
    myNetPosition: user ? balances.get(user.id) ?? 0 : 0,
    goals,
    tips,
    savingsProgress,
    savingsTarget,
    availableGoalCategories,
    memberStats,
    analysisScopes
  });
}
