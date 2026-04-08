export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountType = "personal" | "shared" | "cash" | "bank" | "savings";
export type CategoryKind = "expense" | "income" | "both";
export type HouseholdRole = "owner" | "member";
export type HouseholdMemberStatus = "active" | "invited" | "disabled";
export type TransactionType = "expense" | "income" | "transfer" | "adjustment";
export type SplitMethod = "none" | "equal" | "percentage" | "fixed";
export type TransactionStatus =
  | "draft"
  | "posted"
  | "partially_settled"
  | "settled"
  | "cancelled";
export type SettlementMethod = "bizum" | "cash" | "bank_transfer" | "card" | "other";
export type AuditAction = "insert" | "update" | "delete" | "status_change";
export type InvitationStatus = "pending" | "sent" | "accepted" | "revoked" | "expired";
export type BudgetGoalPeriod = "monthly";
export type ThemeMode = "light" | "dark";
export type ThemeSource = "manual" | "ai";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  created_at: string;
}

export interface Account {
  id: string;
  household_id: string;
  owner_user_id: string | null;
  name: string;
  type: AccountType;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountMember {
  account_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null;
}

export interface AccountWithDetails extends Account {
  members: AccountMember[];
  current_balance: number;
  opening_balance: number;
}

export interface Category {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  household_id: string;
  created_by: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  paid_by_user_id: string | null;
  beneficiary_user_id: string | null;
  is_shared: boolean;
  split_method: SplitMethod;
  transaction_date: string;
  status: TransactionStatus;
  external_ref: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  user_id: string;
  share_amount: number;
  share_percent: number | null;
  is_debtor: boolean;
  created_at: string;
}

export interface Settlement {
  id: string;
  household_id: string;
  transaction_id: string | null;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  settlement_date: string;
  method: SettlementMethod;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  household_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Json;
  is_read: boolean;
  created_at: string;
}

export interface HouseholdInvitation {
  id: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  send_email: boolean;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetGoal {
  id: string;
  household_id: string;
  category_id: string;
  created_by: string;
  period: BudgetGoalPeriod;
  target_percent: number | null;
  target_amount: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "name" | "color" | "icon" | "kind"> | null;
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  muted: string;
  muted_foreground: string;
  card: string;
  card_foreground: string;
  border: string;
  ring: string;
  primary: string;
  primary_foreground: string;
  secondary: string;
  secondary_foreground: string;
  accent: string;
  accent_foreground: string;
  success: string;
  success_foreground: string;
  warning: string;
  warning_foreground: string;
  danger: string;
  danger_foreground: string;
}

export interface UserThemePreference {
  id: string;
  user_id: string;
  theme_name: string | null;
  source: ThemeSource;
  mode: ThemeMode;
  prompt: string | null;
  tokens: ThemeTokens;
  created_at: string;
  updated_at: string;
}

export interface TransactionAuditLog {
  id: string;
  transaction_id: string | null;
  changed_by: string | null;
  action: AuditAction;
  before_data: Json | null;
  after_data: Json | null;
  created_at: string;
}

export interface TransactionBalanceView {
  transaction_id: string;
  household_id: string;
  title: string;
  transaction_amount: number;
  transaction_date: string;
  paid_by_user_id: string | null;
  owed_to_payer: number;
  settled_amount: number;
  pending_amount: number;
}

export interface MonthlySummaryView {
  household_id: string;
  month: string;
  type: TransactionType;
  total_amount: number;
}

export interface CategoryMonthlyExpenseView {
  household_id: string;
  month: string;
  category_name: string | null;
  total_amount: number;
}

export interface TransactionWithRelations extends Transaction {
  account: Pick<Account, "id" | "name" | "type" | "currency"> | null;
  category: Pick<Category, "id" | "name" | "kind" | "color" | "icon"> | null;
  paid_by_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
  beneficiary_profile: Pick<Profile, "id" | "full_name" | "email"> | null;
  splits: TransactionSplit[];
  settlements: Settlement[];
  balance: TransactionBalanceView | null;
}

export interface HouseholdBundle {
  household: Household;
  members: Array<
    HouseholdMember & {
      profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null;
    }
  >;
}

export interface AppDashboard {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  myExpenses: number;
  myIncome: number;
  myRecordedTransactions: number;
  myLastActivityAt: string | null;
  myNetPosition: number;
  expenseByCategory: Array<{ categoryName: string; totalAmount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number; balance: number }>;
  pendingByTransaction: TransactionBalanceView[];
  goals: DashboardGoal[];
  tips: DashboardTip[];
  savingsTarget: number;
  savingsProgress: number;
  availableGoalCategories: Pick<Category, "id" | "name" | "color" | "icon" | "kind">[];
  memberStats: DashboardMemberStat[];
  analysisScopes: DashboardAnalysisScope[];
}

export interface DashboardGoal {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  spentAmount: number;
  targetAmount: number;
  targetPercent: number | null;
  progressRatio: number;
  varianceAmount: number;
  isCustom: boolean;
  note: string | null;
}

export interface DashboardTip {
  id: string;
  tone: "positive" | "warning" | "critical";
  title: string;
  description: string;
}

export interface DashboardMemberStat {
  userId: string;
  label: string;
  role: HouseholdRole;
  totalPaidExpenses: number;
  totalRecordedIncome: number;
  netPosition: number;
  recordedTransactions: number;
  lastActivityAt: string | null;
}

export interface DashboardAnalysisScope {
  id: string;
  label: string;
  description: string;
  kind: "overview" | "personal" | "shared" | "account";
  accountCount: number;
  currentBalance: number;
  totalExpenses: number;
  totalIncome: number;
  monthlyNet: number;
  pendingAmount: number;
  transactionCount: number;
  expenseByCategory: Array<{ categoryName: string; totalAmount: number }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number; balance: number }>;
}
