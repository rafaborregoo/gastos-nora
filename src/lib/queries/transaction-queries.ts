import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import type {
  Settlement,
  Transaction,
  TransactionAuditLog,
  TransactionBalanceView,
  TransactionSplit,
  TransactionWithRelations
} from "@/types/database";
import { deriveTransactionStatus, mapBalanceView } from "@/lib/calculations/transactions";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";
import { getAccounts, getCurrentHouseholdBundle } from "@/lib/queries/household-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface TransactionFilters {
  ownership?: "mine" | "others" | "shared" | "all";
  month?: string;
  categoryId?: string;
  status?: string;
}

type TransactionVisibilityRow = Pick<
  TransactionWithRelations,
  "id" | "household_id" | "created_by" | "paid_by_user_id" | "beneficiary_user_id" | "is_shared" | "splits" | "settlements"
> & {
  account: { id: string; type: string; owner_user_id?: string | null } | null;
};

function canAccessTransaction(
  transaction: TransactionWithRelations & {
    account: (TransactionWithRelations["account"] & { owner_user_id?: string | null }) | null;
  },
  currentUserId?: string
) {
  if (!currentUserId) {
    return false;
  }

  const accountOwnerId = transaction.account?.owner_user_id ?? null;
  const isSharedAccount = transaction.account?.type === "shared";
  const isOwnPrivateAccount = accountOwnerId === currentUserId;
  const isParticipant =
    transaction.created_by === currentUserId ||
    transaction.paid_by_user_id === currentUserId ||
    transaction.beneficiary_user_id === currentUserId ||
    transaction.splits.some((split) => split.user_id === currentUserId);

  return isSharedAccount || isOwnPrivateAccount || (transaction.is_shared && isParticipant);
}

function isAuditLogUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "42501" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("transaction_audit_log") === true
  );
}

function isBalanceViewUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "42501" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("v_transaction_balance") === true
  );
}

function buildMonthRange(month?: string) {
  if (!month) {
    return null;
  }

  const start = `${month}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const nextMonth = new Date(startDate);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  return { start, end: nextMonth.toISOString().slice(0, 10) };
}

function getDestinationAccountId(metadata: Transaction["metadata"]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return typeof metadata.destination_account_id === "string" ? metadata.destination_account_id : null;
}

export async function getTransactions(filters: TransactionFilters = {}) {
  noStore();
  const [context, user] = await Promise.all([getCurrentHouseholdBundle(), getAuthenticatedUser()]);

  if (!context) {
    return [] satisfies TransactionWithRelations[];
  }

  const currentUserId = user?.id;
  const visibleAccounts = await getAccounts(context.household.id, { includeInactive: true });
  const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id));
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("transactions")
    .select(
      "*, account:accounts(id, name, type, currency, owner_user_id), category:categories(id, name, kind, color, icon), paid_by_profile:profiles!transactions_paid_by_user_id_fkey(id, full_name, email), beneficiary_profile:profiles!transactions_beneficiary_user_id_fkey(id, full_name, email), splits:transaction_splits(*), settlements:settlements(*)"
    )
    .eq("household_id", context.household.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.month) {
    const range = buildMonthRange(filters.month);
    if (range) {
      query = query.gte("transaction_date", range.start).lt("transaction_date", range.end);
    }
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.ownership === "shared") {
    query = query.eq("is_shared", true);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = ((data ?? []) as TransactionWithRelations[]).map((transaction) => {
    const splits = (transaction.splits ?? []) as TransactionSplit[];
    const settlements = (transaction.settlements ?? []) as Settlement[];

    return {
      ...transaction,
      balance: mapBalanceView(transaction as Transaction, splits, settlements),
      status: deriveTransactionStatus(transaction as Transaction, splits, settlements)
    };
  });

  return items.filter((transaction) => {
    const destinationAccountId = getDestinationAccountId(transaction.metadata);
    const touchesVisibleAccount =
      visibleAccountIds.has(transaction.account_id) || (destinationAccountId ? visibleAccountIds.has(destinationAccountId) : false);

    if (!touchesVisibleAccount) {
      return false;
    }

    if (!canAccessTransaction(transaction, currentUserId)) {
      return false;
    }

    if (filters.ownership === "mine" && currentUserId) {
      return transaction.created_by === currentUserId || transaction.paid_by_user_id === currentUserId;
    }

    if (filters.ownership === "others" && currentUserId) {
      return transaction.created_by !== currentUserId && transaction.paid_by_user_id !== currentUserId;
    }

    return true;
  });
}

export async function getTransactionById(id: string) {
  noStore();
  const [supabase, user] = [createServerSupabaseClient(), await getAuthenticatedUser()];

  const [transactionResponse, auditResponse, balanceResponse] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "*, account:accounts(id, name, type, currency, owner_user_id), category:categories(id, name, kind, color, icon), paid_by_profile:profiles!transactions_paid_by_user_id_fkey(id, full_name, email), beneficiary_profile:profiles!transactions_beneficiary_user_id_fkey(id, full_name, email), splits:transaction_splits(*), settlements:settlements(*)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("transaction_audit_log").select("*").eq("transaction_id", id).order("created_at", { ascending: false }),
    supabase.from("v_transaction_balance").select("*").eq("transaction_id", id).maybeSingle()
  ]);

  if (transactionResponse.error) {
    throw new Error(transactionResponse.error.message);
  }

  if (auditResponse.error && !isAuditLogUnavailable(auditResponse.error)) {
    throw new Error(auditResponse.error.message);
  }

  if (balanceResponse.error && !isBalanceViewUnavailable(balanceResponse.error)) {
    throw new Error(balanceResponse.error.message);
  }

  const transaction = transactionResponse.data as TransactionWithRelations | null;
  if (!transaction) {
    return null;
  }

  const context = await getCurrentHouseholdBundle();
  const visibleAccounts = context ? await getAccounts(context.household.id, { includeInactive: true }) : [];
  const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id));
  const destinationAccountId = getDestinationAccountId(transaction.metadata);
  const touchesVisibleAccount =
    visibleAccountIds.has(transaction.account_id) || (destinationAccountId ? visibleAccountIds.has(destinationAccountId) : false);

  if (!touchesVisibleAccount) {
    return null;
  }

  if (!canAccessTransaction(transaction as TransactionWithRelations & { account: { owner_user_id?: string | null } | null }, user?.id)) {
    return null;
  }

  return {
    ...transaction,
    balance:
      (balanceResponse.data as TransactionBalanceView | null) ??
      mapBalanceView(
        transaction as Transaction,
        (transaction.splits ?? []) as TransactionSplit[],
        (transaction.settlements ?? []) as Settlement[]
      ),
    auditLog: (auditResponse.data as TransactionAuditLog[]) ?? []
  };
}

export async function getTransactionBalances(): Promise<TransactionBalanceView[]> {
  noStore();
  const [context, user, supabase] = await Promise.all([
    getCurrentHouseholdBundle(),
    getAuthenticatedUser(),
    Promise.resolve(createServerSupabaseClient())
  ]);

  if (!context || !user) {
    return [];
  }

  const visibleAccounts = await getAccounts(context.household.id, { includeInactive: true });
  const visibleAccountIds = new Set(visibleAccounts.map((account) => account.id));
  const visibleTransactionsResponse = await supabase
    .from("transactions")
    .select("*, account:accounts(id, name, type, currency, owner_user_id), category:categories(id, name, kind, color, icon), paid_by_profile:profiles!transactions_paid_by_user_id_fkey(id, full_name, email), beneficiary_profile:profiles!transactions_beneficiary_user_id_fkey(id, full_name, email), splits:transaction_splits(*), settlements:settlements(*)")
    .eq("household_id", context.household.id);

  if (visibleTransactionsResponse.error) {
    throw new Error(visibleTransactionsResponse.error.message);
  }

  const visibleTransactionIds = ((visibleTransactionsResponse.data ?? []) as unknown as TransactionVisibilityRow[]).filter(
    (transaction) =>
      transaction.account?.id &&
      visibleAccountIds.has(transaction.account.id) &&
      canAccessTransaction(transaction as TransactionWithRelations & { account: { owner_user_id?: string | null } | null }, user.id)
  );

  if (!visibleTransactionIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("v_transaction_balance")
    .select("*")
    .eq("household_id", context.household.id)
    .in(
      "transaction_id",
      visibleTransactionIds.map((transaction) => transaction.id)
    )
    .order("transaction_date", { ascending: false });

  if (error && !isBalanceViewUnavailable(error)) {
    throw new Error(error.message);
  }

  if (!error) {
    return (data as TransactionBalanceView[]) ?? [];
  }

  return visibleTransactionIds
    .map((transaction) =>
      mapBalanceView(
        transaction as unknown as Transaction,
        ((transaction as unknown as TransactionWithRelations).splits ?? []) as TransactionSplit[],
        ((transaction as unknown as TransactionWithRelations).settlements ?? []) as Settlement[]
      )
    )
    .sort((left, right) => (left.transaction_date < right.transaction_date ? 1 : -1));
}
