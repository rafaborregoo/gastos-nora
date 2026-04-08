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
import { getCurrentHouseholdBundle } from "@/lib/queries/household-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface TransactionFilters {
  ownership?: "mine" | "others" | "shared" | "all";
  month?: string;
  categoryId?: string;
  status?: string;
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

export async function getTransactions(filters: TransactionFilters = {}) {
  noStore();
  const [context, user] = await Promise.all([getCurrentHouseholdBundle(), getAuthenticatedUser()]);

  if (!context) {
    return [] satisfies TransactionWithRelations[];
  }

  const currentUserId = user?.id;
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("transactions")
    .select(
      "*, account:accounts(id, name, type, currency), category:categories(id, name, kind, color, icon), paid_by_profile:profiles!transactions_paid_by_user_id_fkey(id, full_name, email), beneficiary_profile:profiles!transactions_beneficiary_user_id_fkey(id, full_name, email), splits:transaction_splits(*), settlements:settlements(*)"
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
  const supabase = createServerSupabaseClient();

  const [transactionResponse, auditResponse, balanceResponse] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "*, account:accounts(id, name, type, currency), category:categories(id, name, kind, color, icon), paid_by_profile:profiles!transactions_paid_by_user_id_fkey(id, full_name, email), beneficiary_profile:profiles!transactions_beneficiary_user_id_fkey(id, full_name, email), splits:transaction_splits(*), settlements:settlements(*)"
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

  if (balanceResponse.error) {
    throw new Error(balanceResponse.error.message);
  }

  const transaction = transactionResponse.data as TransactionWithRelations | null;
  if (!transaction) {
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
  const context = await getCurrentHouseholdBundle();

  if (!context) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("v_transaction_balance")
    .select("*")
    .eq("household_id", context.household.id)
    .order("transaction_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as TransactionBalanceView[]) ?? [];
}
