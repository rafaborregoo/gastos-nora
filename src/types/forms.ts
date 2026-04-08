import type {
  CategoryKind,
  SettlementMethod,
  SplitMethod,
  ThemeMode,
  TransactionType
} from "@/types/database";

export interface TransactionSplitInput {
  userId: string;
  shareAmount: number;
  sharePercent?: number;
  isDebtor?: boolean;
}

export interface AuthFormValues {
  email: string;
  password: string;
  fullName?: string;
}

export interface HouseholdSetupValues {
  householdName: string;
  addMemberEmail?: string;
  sendInviteEmail?: boolean;
  accounts: Array<{
    name: string;
    type: "personal" | "shared" | "cash" | "bank" | "savings";
    ownerUserId?: string | null;
  }>;
}

export interface InvitationFormValues {
  email: string;
  sendEmail: boolean;
}

export interface CategoryFormValues {
  id?: string;
  name: string;
  kind: CategoryKind;
  color?: string;
  icon?: string;
}

export interface AccountFormValues {
  id?: string;
  name: string;
  type: "personal" | "shared" | "cash" | "bank" | "savings";
  ownerUserId?: string | null;
  memberUserIds?: string[];
  currency?: string;
  initialBalance?: number;
}

export interface BudgetGoalFormValues {
  id?: string;
  categoryId: string;
  targetPercent?: number;
  targetAmount: number;
  note?: string;
}

export interface ThemeSettingsFormValues {
  mode: ThemeMode;
  themeName?: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  border: string;
}

export interface GenerateThemeFormValues {
  prompt: string;
}

export interface TransactionFormValues {
  id?: string;
  type: TransactionType;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  transactionDate: string;
  accountId: string;
  categoryId?: string;
  paidByUserId?: string;
  beneficiaryUserId?: string;
  isShared: boolean;
  splitMethod: SplitMethod;
  splits: TransactionSplitInput[];
  note?: string;
  externalRef?: string;
}

export interface SettlementFormValues {
  id?: string;
  transactionId?: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  settlementDate: string;
  method: SettlementMethod;
  note?: string;
}
