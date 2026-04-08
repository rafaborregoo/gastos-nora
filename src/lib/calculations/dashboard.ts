import type { AppDashboard, MonthlySummaryView, TransactionBalanceView } from "@/types/database";

export function buildMonthlyDashboard(params: {
  month: string;
  summaries: MonthlySummaryView[];
  categoryExpenses: Array<{ categoryName: string; totalAmount: number }>;
  trend: Array<{ month: string; income: number; expense: number }>;
  pendingByTransaction: TransactionBalanceView[];
  goals: AppDashboard["goals"];
  tips: AppDashboard["tips"];
  savingsTarget: number;
  savingsProgress: number;
  availableGoalCategories: AppDashboard["availableGoalCategories"];
  memberStats: AppDashboard["memberStats"];
}): AppDashboard {
  const totalExpenses =
    params.summaries.find((summary) => summary.type === "expense" && summary.month === params.month)
      ?.total_amount ?? 0;
  const totalIncome =
    params.summaries.find((summary) => summary.type === "income" && summary.month === params.month)
      ?.total_amount ?? 0;

  return {
    month: params.month,
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    expenseByCategory: params.categoryExpenses,
    monthlyTrend: params.trend.map((item) => ({
      ...item,
      balance: item.income - item.expense
    })),
    pendingByTransaction: params.pendingByTransaction,
    goals: params.goals,
    tips: params.tips,
    savingsTarget: params.savingsTarget,
    savingsProgress: params.savingsProgress,
    availableGoalCategories: params.availableGoalCategories,
    memberStats: params.memberStats
  };
}
