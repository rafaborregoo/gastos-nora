import type {
  AccountWithDetails,
  AppDashboard,
  DashboardAnalysisScope,
  Json,
  MonthlySummaryView,
  TransactionBalanceView,
  TransactionWithRelations
} from "@/types/database";

function getDestinationAccountId(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return typeof metadata.destination_account_id === "string" ? metadata.destination_account_id : null;
}

function isTransactionInMonth(transactionDate: string, monthStart: string) {
  const start = new Date(`${monthStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return transactionDate >= monthStart && transactionDate < end.toISOString().slice(0, 10);
}

function transactionTouchesAccounts(transaction: TransactionWithRelations, accountIds: Set<string>) {
  if (accountIds.has(transaction.account_id)) {
    return true;
  }

  if (transaction.type !== "transfer") {
    return false;
  }

  const destinationAccountId = getDestinationAccountId(transaction.metadata);
  return destinationAccountId ? accountIds.has(destinationAccountId) : false;
}

function buildScope({
  id,
  label,
  description,
  kind,
  accounts,
  transactions,
  currentMonth,
  trendMonths
}: {
  id: string;
  label: string;
  description: string;
  kind: DashboardAnalysisScope["kind"];
  accounts: AccountWithDetails[];
  transactions: TransactionWithRelations[];
  currentMonth: string;
  trendMonths: string[];
}): DashboardAnalysisScope {
  const accountIds = new Set(accounts.map((account) => account.id));
  const scopedTransactions = transactions.filter((transaction) => transactionTouchesAccounts(transaction, accountIds));
  const currentMonthTransactions = scopedTransactions.filter((transaction) =>
    isTransactionInMonth(transaction.transaction_date, currentMonth)
  );

  const totalExpenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryMap = new Map<string, number>();
  for (const transaction of currentMonthTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const categoryName = transaction.category?.name ?? "Sin categoría";
    categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + transaction.amount);
  }

  const expenseByCategory = Array.from(categoryMap.entries())
    .map(([categoryName, totalAmount]) => ({ categoryName, totalAmount }))
    .sort((left, right) => right.totalAmount - left.totalAmount);

  const monthlyTrend = trendMonths.map((monthStart) => {
    const monthTransactions = scopedTransactions.filter((transaction) => isTransactionInMonth(transaction.transaction_date, monthStart));
    const income = monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      month: monthStart,
      income,
      expense,
      balance: income - expense
    };
  });

  return {
    id,
    label,
    description,
    kind,
    accountCount: accounts.length,
    currentBalance: accounts.reduce((sum, account) => sum + account.current_balance, 0),
    totalExpenses,
    totalIncome,
    monthlyNet: totalIncome - totalExpenses,
    pendingAmount: currentMonthTransactions.reduce((sum, transaction) => sum + (transaction.balance?.pending_amount ?? 0), 0),
    transactionCount: currentMonthTransactions.length,
    expenseByCategory,
    monthlyTrend
  };
}

export function buildAnalysisScopes(params: {
  currentMonth: string;
  trendMonths: string[];
  accounts: AccountWithDetails[];
  transactions: TransactionWithRelations[];
  currentUserId?: string;
}): DashboardAnalysisScope[] {
  const { currentMonth, trendMonths, accounts, transactions, currentUserId } = params;
  const scopes: DashboardAnalysisScope[] = [];

  if (accounts.length) {
    scopes.push(
      buildScope({
        id: "overview",
        label: "Mi panorama",
        description: "Todo lo que puedes ver: tus cuentas y las compartidas.",
        kind: "overview",
        accounts,
        transactions,
        currentMonth,
        trendMonths
      })
    );
  }

  const personalAccounts = accounts.filter((account) => account.type !== "shared" && account.owner_user_id === currentUserId);
  if (personalAccounts.length) {
    scopes.push(
      buildScope({
        id: "personal",
        label: "Mis personales",
        description: "Solo tus cuentas privadas y su actividad.",
        kind: "personal",
        accounts: personalAccounts,
        transactions,
        currentMonth,
        trendMonths
      })
    );
  }

  const sharedAccounts = accounts.filter((account) => account.type === "shared");
  if (sharedAccounts.length) {
    scopes.push(
      buildScope({
        id: "shared",
        label: "Compartidas",
        description: "Todas las cuentas comunes del hogar que compartís.",
        kind: "shared",
        accounts: sharedAccounts,
        transactions,
        currentMonth,
        trendMonths
      })
    );
  }

  for (const account of accounts) {
    scopes.push(
      buildScope({
        id: `account:${account.id}`,
        label: account.name,
        description:
          account.type === "shared" ? "Cuenta compartida y su comportamiento mensual." : "Cuenta personal y su comportamiento mensual.",
        kind: "account",
        accounts: [account],
        transactions,
        currentMonth,
        trendMonths
      })
    );
  }

  return scopes;
}

export function buildMonthlyDashboard(params: {
  month: string;
  summaries: MonthlySummaryView[];
  categoryExpenses: Array<{ categoryName: string; totalAmount: number }>;
  trend: Array<{ month: string; income: number; expense: number }>;
  pendingByTransaction: TransactionBalanceView[];
  myExpenses: number;
  myIncome: number;
  myRecordedTransactions: number;
  myLastActivityAt: string | null;
  myNetPosition: number;
  goals: AppDashboard["goals"];
  tips: AppDashboard["tips"];
  savingsTarget: number;
  savingsProgress: number;
  availableGoalCategories: AppDashboard["availableGoalCategories"];
  memberStats: AppDashboard["memberStats"];
  analysisScopes: AppDashboard["analysisScopes"];
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
    myExpenses: params.myExpenses,
    myIncome: params.myIncome,
    myRecordedTransactions: params.myRecordedTransactions,
    myLastActivityAt: params.myLastActivityAt,
    myNetPosition: params.myNetPosition,
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
    memberStats: params.memberStats,
    analysisScopes: params.analysisScopes
  };
}
