"use server";

import { accountSchema } from "@/lib/validators/accounts";
import { categorySchema } from "@/lib/validators/categories";
import { getAppContext } from "@/lib/queries/household-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  errorResult,
  handleActionError,
  revalidateAppPaths,
  successResult,
  type ActionResult
} from "@/lib/actions/shared";
import type { Json } from "@/types/database";

function normalizeCurrency(value?: string) {
  return (value ?? "EUR").trim().toUpperCase();
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean))] as string[];
}

function isAccountMembersTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("account_members") === true
  );
}

async function syncAccountMembers(params: { accountId: string; memberUserIds: string[] }) {
  const supabase = createServerSupabaseClient();
  const deleteResponse = await supabase.from("account_members").delete().eq("account_id", params.accountId);

  if (deleteResponse.error) {
    if (isAccountMembersTableMissing(deleteResponse.error)) {
      return { ok: false as const, reason: "missing_table" as const };
    }

    throw new Error(deleteResponse.error.message);
  }

  if (!params.memberUserIds.length) {
    return { ok: true as const };
  }

  const insertResponse = await supabase.from("account_members").insert(
    params.memberUserIds.map((userId, index) => ({
      account_id: params.accountId,
      user_id: userId,
      role: index === 0 ? "owner" : "member"
    }))
  );

  if (insertResponse.error) {
    if (isAccountMembersTableMissing(insertResponse.error)) {
      return { ok: false as const, reason: "missing_table" as const };
    }

    throw new Error(insertResponse.error.message);
  }

  return { ok: true as const };
}

async function syncOpeningBalance(params: {
  accountId: string;
  accountName: string;
  householdId: string;
  userId: string;
  ownerUserId: string | null;
  currency: string;
  amount: number;
}) {
  const supabase = createServerSupabaseClient();
  const existingResponse = await supabase
    .from("transactions")
    .select("id, transaction_date, metadata")
    .eq("account_id", params.accountId)
    .eq("household_id", params.householdId)
    .eq("type", "adjustment");

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message);
  }

  const openingBalanceTransaction = (existingResponse.data ?? []).find((transaction) => {
    const metadata = (transaction.metadata ?? {}) as Json;
    return typeof metadata === "object" && !Array.isArray(metadata) && metadata?.system === "opening_balance";
  });

  if (params.amount <= 0) {
    if (openingBalanceTransaction) {
      const { error } = await supabase.from("transactions").delete().eq("id", openingBalanceTransaction.id as string);

      if (error) {
        throw new Error(error.message);
      }
    }

    return;
  }

  const payload = {
    household_id: params.householdId,
    created_by: params.userId,
    account_id: params.accountId,
    category_id: null,
    type: "adjustment" as const,
    title: `Saldo inicial · ${params.accountName}`,
    description: "Movimiento de apertura generado desde la configuración de cuentas.",
    amount: params.amount,
    currency: params.currency,
    paid_by_user_id: params.ownerUserId,
    beneficiary_user_id: null,
    is_shared: false,
    split_method: "none" as const,
    transaction_date:
      (openingBalanceTransaction?.transaction_date as string | undefined) ?? new Date().toISOString().slice(0, 10),
    status: "posted" as const,
    external_ref: null,
    metadata: {
      system: "opening_balance",
      account_id: params.accountId,
      source: "account_settings"
    }
  };

  const mutation = openingBalanceTransaction
    ? supabase.from("transactions").update(payload).eq("id", openingBalanceTransaction.id as string)
    : supabase.from("transactions").insert(payload);
  const { error } = await mutation;

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertCategoryAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = categorySchema.parse(values);
    const { user, householdBundle } = await getAppContext();

    if (!user || !householdBundle) {
      return errorResult("Necesitas un hogar activo.");
    }

    const supabase = createServerSupabaseClient();
    const payload = {
      household_id: householdBundle.household.id,
      created_by: user.id,
      name: parsed.name,
      kind: parsed.kind,
      color: parsed.color ?? null,
      icon: parsed.icon ?? null
    };

    const query = parsed.id
      ? supabase.from("categories").update(payload).eq("id", parsed.id)
      : supabase.from("categories").insert(payload);
    const { error } = await query;

    if (error) {
      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult(parsed.id ? "Categoría actualizada." : "Categoría creada.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function upsertAccountAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = accountSchema.parse(values);
    const { user, householdBundle } = await getAppContext();

    if (!user || !householdBundle) {
      return errorResult("Necesitas un hogar activo.");
    }

    const householdMemberIds = new Set(householdBundle.members.map((member) => member.user_id));
    const sanitizedOwnerId =
      parsed.type === "shared" ? null : parsed.ownerUserId && householdMemberIds.has(parsed.ownerUserId) ? parsed.ownerUserId : null;
    const requestedMemberIds = parsed.memberUserIds.filter((memberId) => householdMemberIds.has(memberId));
    const linkedMemberIds =
      parsed.type === "shared"
        ? uniqueIds(requestedMemberIds)
        : uniqueIds([sanitizedOwnerId, ...requestedMemberIds]);

    if (parsed.type !== "shared" && !sanitizedOwnerId) {
      return errorResult("Selecciona una persona titular válida.");
    }

    if (parsed.type === "shared" && linkedMemberIds.length === 0) {
      return errorResult("Selecciona al menos una persona vinculada.");
    }

    const supabase = createServerSupabaseClient();
    const payload = {
      household_id: householdBundle.household.id,
      owner_user_id: sanitizedOwnerId,
      name: parsed.name,
      type: parsed.type,
      currency: normalizeCurrency(parsed.currency),
      is_active: true
    };

    const mutation = parsed.id
      ? supabase.from("accounts").update(payload).eq("id", parsed.id).select("*").single()
      : supabase.from("accounts").insert(payload).select("*").single();
    const { data, error } = await mutation;

    if (error || !data) {
      return errorResult(error?.message ?? "No se pudo guardar la cuenta.");
    }

    const accountId = data.id as string;
    const memberSync = await syncAccountMembers({
      accountId,
      memberUserIds: linkedMemberIds
    });

    if (!memberSync.ok && linkedMemberIds.length > 1) {
      return errorResult(
        "Para vincular varias personas a una cuenta debes crear primero la tabla account_members en Supabase."
      );
    }

    await syncOpeningBalance({
      accountId,
      accountName: parsed.name,
      householdId: householdBundle.household.id,
      userId: user.id,
      ownerUserId: sanitizedOwnerId,
      currency: normalizeCurrency(parsed.currency),
      amount: parsed.initialBalance
    });

    revalidateAppPaths();
    return successResult(parsed.id ? "Cuenta actualizada." : "Cuenta creada.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function toggleAccountActiveAction(accountId: string, nextActiveState: boolean): Promise<ActionResult> {
  try {
    const { householdBundle } = await getAppContext();

    if (!householdBundle) {
      return errorResult("Necesitas un hogar activo.");
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: nextActiveState })
      .eq("id", accountId)
      .eq("household_id", householdBundle.household.id);

    if (error) {
      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult(nextActiveState ? "Cuenta reactivada." : "Cuenta archivada.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteAccountAction(accountId: string): Promise<ActionResult> {
  try {
    const { householdBundle } = await getAppContext();

    if (!householdBundle) {
      return errorResult("Necesitas un hogar activo.");
    }

    const supabase = createServerSupabaseClient();
    const transactionsResponse = await supabase
      .from("transactions")
      .select("id, type, metadata")
      .eq("account_id", accountId)
      .eq("household_id", householdBundle.household.id);

    if (transactionsResponse.error) {
      return errorResult(transactionsResponse.error.message);
    }

    const relatedTransactions = transactionsResponse.data ?? [];
    const openingBalanceTransactions = relatedTransactions.filter((transaction) => {
      const metadata = (transaction.metadata ?? {}) as Json;

      return (
        transaction.type === "adjustment" &&
        typeof metadata === "object" &&
        !Array.isArray(metadata) &&
        metadata?.system === "opening_balance"
      );
    });

    if (relatedTransactions.length > openingBalanceTransactions.length) {
      return errorResult("No puedes borrar una cuenta que ya tiene movimientos. Archívala si quieres ocultarla.");
    }

    if (openingBalanceTransactions.length) {
      const { error: deleteOpeningBalanceError } = await supabase
        .from("transactions")
        .delete()
        .in(
          "id",
          openingBalanceTransactions.map((transaction) => transaction.id as string)
        );

      if (deleteOpeningBalanceError) {
        return errorResult(deleteOpeningBalanceError.message);
      }
    }

    const deleteMembersResponse = await supabase.from("account_members").delete().eq("account_id", accountId);
    if (deleteMembersResponse.error && !isAccountMembersTableMissing(deleteMembersResponse.error)) {
      return errorResult(deleteMembersResponse.error.message);
    }

    const { error: deleteAccountError } = await supabase
      .from("accounts")
      .delete()
      .eq("id", accountId)
      .eq("household_id", householdBundle.household.id);

    if (deleteAccountError) {
      return errorResult(deleteAccountError.message);
    }

    revalidateAppPaths();
    return successResult("Cuenta eliminada.");
  } catch (error) {
    return handleActionError(error);
  }
}
