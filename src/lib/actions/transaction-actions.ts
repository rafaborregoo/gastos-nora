"use server";

import { getAppContext } from "@/lib/queries/household-queries";
import { getTransactionById } from "@/lib/queries/transaction-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildSplits,
  calculatePendingAmount,
  deriveTransactionStatus,
  validateSplitTotal
} from "@/lib/calculations/transactions";
import { errorResult, handleActionError, revalidateAppPaths, successResult, type ActionResult } from "@/lib/actions/shared";
import { settlementSchema, transactionSchema } from "@/lib/validators/transactions";

function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter(Boolean) as T[];
}

async function notifyUsers(params: {
  householdId: string;
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}) {
  if (!params.userIds.length) {
    return;
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("notifications").insert(
    params.userIds.map((userId) => ({
      household_id: params.householdId,
      user_id: userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      payload: params.payload ?? {}
    }))
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveTransactionAction(values: unknown): Promise<ActionResult<{ transactionId: string }>> {
  try {
    const parsed = transactionSchema.parse(values);
    const { user, householdBundle } = await getAppContext();

    if (!user || !householdBundle) {
      return errorResult("Necesitas iniciar sesión y tener un hogar activo.");
    }

    const supabase = createServerSupabaseClient();
    const generatedSplits =
      parsed.isShared && parsed.type === "expense"
        ? buildSplits({
            amount: parsed.amount,
            splitMethod: parsed.splitMethod,
            memberIds: parsed.splitMethod === "equal" ? parsed.splits.map((split) => split.userId) : [],
            manualSplits: parsed.splits
          })
        : [];

    if (parsed.isShared && parsed.type === "expense" && !validateSplitTotal(parsed.amount, generatedSplits)) {
      return errorResult("La suma de los repartos no coincide con el importe.");
    }

    if (parsed.id) {
      const existing = await getTransactionById(parsed.id);

      if (!existing) {
        return errorResult("No hemos encontrado la transacción.");
      }

      if (existing.settlements.length > 0) {
        const tentativeOwed = generatedSplits.reduce((sum, split) => {
          if (split.userId === parsed.paidByUserId) {
            return sum;
          }

          return sum + split.shareAmount;
        }, 0);
        const settledAlready = existing.settlements.reduce((sum, settlement) => sum + settlement.amount, 0);

        if (settledAlready > tentativeOwed) {
          return errorResult("No puedes dejar el pendiente por debajo de lo ya liquidado.");
        }
      }
    }

    const payload = {
      household_id: householdBundle.household.id,
      created_by: user.id,
      account_id: parsed.accountId,
      category_id: parsed.categoryId || null,
      type: parsed.type,
      title: parsed.title,
      description: parsed.description || null,
      amount: parsed.amount,
      currency: parsed.currency,
      paid_by_user_id: parsed.paidByUserId || null,
      beneficiary_user_id: parsed.beneficiaryUserId || null,
      is_shared: parsed.isShared,
      split_method: parsed.isShared ? parsed.splitMethod : "none",
      transaction_date: parsed.transactionDate,
      status: "posted",
      external_ref: parsed.externalRef || null,
      metadata: {
        note: parsed.note ?? ""
      }
    };

    const mutation = parsed.id
      ? supabase.from("transactions").update(payload).eq("id", parsed.id).select("*").single()
      : supabase.from("transactions").insert(payload).select("*").single();
    const { data: transaction, error } = await mutation;

    if (error || !transaction) {
      return errorResult(error?.message ?? "No se pudo guardar la transacción.");
    }

    const transactionId = transaction.id as string;

    await supabase.from("transaction_splits").delete().eq("transaction_id", transactionId);

    if (generatedSplits.length > 0) {
      const { error: splitError } = await supabase.from("transaction_splits").insert(
        generatedSplits.map((split) => ({
          transaction_id: transactionId,
          user_id: split.userId,
          share_amount: split.shareAmount,
          share_percent: split.sharePercent ?? null,
          is_debtor: split.isDebtor ?? true
        }))
      );

      if (splitError) {
        return errorResult(splitError.message);
      }

      const { error: validationError } = await supabase.rpc("validate_transaction_splits", { tx_id: transactionId });

      if (validationError) {
        return errorResult(validationError.message);
      }
    }

    const freshTransaction = await getTransactionById(transactionId);
    if (freshTransaction) {
      const derivedStatus = deriveTransactionStatus(freshTransaction, freshTransaction.splits, freshTransaction.settlements);
      if (derivedStatus !== freshTransaction.status) {
        await supabase.from("transactions").update({ status: derivedStatus }).eq("id", transactionId);
      }
    }

    const affectedUserIds = new Set(
      compact([
        parsed.paidByUserId,
        parsed.beneficiaryUserId,
        ...generatedSplits.map((split) => split.userId)
      ]).filter((id) => id !== user.id)
    );

    await notifyUsers({
      householdId: householdBundle.household.id,
      userIds: [...affectedUserIds],
      type: parsed.id ? "transaction.updated" : "transaction.created",
      title: parsed.id ? "Movimiento actualizado" : "Nuevo movimiento",
      body: `${parsed.title} por ${parsed.amount.toFixed(2)} ${parsed.currency}`,
      payload: { transactionId }
    });

    revalidateAppPaths();
    return successResult(parsed.id ? "Movimiento actualizado." : "Movimiento creado.", { transactionId });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createSettlementAction(values: unknown): Promise<ActionResult<{ settlementId: string }>> {
  try {
    const parsed = settlementSchema.parse(values);
    const { user, householdBundle } = await getAppContext();

    if (!user || !householdBundle) {
      return errorResult("Necesitas iniciar sesión y tener un hogar activo.");
    }

    if (parsed.fromUserId === parsed.toUserId) {
      return errorResult("La persona que paga y la que recibe no pueden ser la misma.");
    }

    let transactionTitle = "Liquidación general";

    if (parsed.transactionId) {
      const transaction = await getTransactionById(parsed.transactionId);

      if (!transaction) {
        return errorResult("La transacción indicada no existe.");
      }

      const pendingAmount = calculatePendingAmount(transaction, transaction.splits, transaction.settlements);
      if (parsed.amount > pendingAmount) {
        return errorResult("La liquidación no puede superar el importe pendiente.");
      }

      transactionTitle = transaction.title;
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("settlements")
      .insert({
        household_id: householdBundle.household.id,
        transaction_id: parsed.transactionId || null,
        from_user_id: parsed.fromUserId,
        to_user_id: parsed.toUserId,
        amount: parsed.amount,
        currency: parsed.currency,
        settlement_date: parsed.settlementDate,
        method: parsed.method,
        note: parsed.note || null,
        created_by: user.id
      })
      .select("*")
      .single();

    if (error || !data) {
      return errorResult(error?.message ?? "No se pudo registrar la liquidación.");
    }

    if (parsed.transactionId) {
      const freshTransaction = await getTransactionById(parsed.transactionId);
      if (freshTransaction) {
        const derivedStatus = deriveTransactionStatus(freshTransaction, freshTransaction.splits, freshTransaction.settlements);
        await supabase.from("transactions").update({ status: derivedStatus }).eq("id", parsed.transactionId);
      }
    }

    await notifyUsers({
      householdId: householdBundle.household.id,
      userIds: [parsed.toUserId].filter((id) => id !== user.id),
      type: "settlement.created",
      title: "Nueva liquidación registrada",
      body: `${parsed.amount.toFixed(2)} ${parsed.currency} para ${transactionTitle}`,
      payload: { transactionId: parsed.transactionId || null, settlementId: data.id }
    });

    revalidateAppPaths();
    return successResult("Liquidación registrada.", { settlementId: data.id as string });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function cancelTransactionAction(transactionId: string): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("transactions").update({ status: "cancelled" }).eq("id", transactionId);

    if (error) {
      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult("Movimiento cancelado.");
  } catch (error) {
    return handleActionError(error);
  }
}
