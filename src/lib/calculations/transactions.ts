import type {
  Settlement,
  SplitMethod,
  Transaction,
  TransactionBalanceView,
  TransactionSplit,
  TransactionStatus
} from "@/types/database";
import type { TransactionSplitInput } from "@/types/forms";
import { toNumber } from "@/lib/utils";

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildSplits({
  amount,
  splitMethod,
  memberIds,
  manualSplits
}: {
  amount: number;
  splitMethod: SplitMethod;
  memberIds: string[];
  manualSplits?: TransactionSplitInput[];
}) {
  const baseAmount = roundToCents(amount);

  if (splitMethod === "none") {
    return manualSplits?.slice(0, 1).map((split) => ({
      userId: split.userId,
      shareAmount: baseAmount,
      sharePercent: 100,
      isDebtor: true
    })) ?? [];
  }

  if (splitMethod === "equal") {
    if (!memberIds.length) {
      return [];
    }

    const evenShare = roundToCents(baseAmount / memberIds.length);

    return memberIds.map((userId, index) => {
      const isLast = index === memberIds.length - 1;
      const previous = roundToCents(evenShare * index);
      const shareAmount = isLast ? roundToCents(baseAmount - previous) : evenShare;

      return {
        userId,
        shareAmount,
        sharePercent: roundToCents((shareAmount / baseAmount) * 100),
        isDebtor: true
      };
    });
  }

  if (!manualSplits?.length) {
    return [];
  }

  if (splitMethod === "percentage") {
    return manualSplits.map((split) => {
      const sharePercent = toNumber(split.sharePercent);
      return {
        userId: split.userId,
        sharePercent,
        shareAmount: roundToCents((baseAmount * sharePercent) / 100),
        isDebtor: split.isDebtor ?? true
      };
    });
  }

  return manualSplits.map((split) => ({
    userId: split.userId,
    shareAmount: roundToCents(split.shareAmount),
    sharePercent: baseAmount === 0 ? 0 : roundToCents((split.shareAmount / baseAmount) * 100),
    isDebtor: split.isDebtor ?? true
  }));
}

export function validateSplitTotal(amount: number, splits: Array<Pick<TransactionSplitInput, "shareAmount">>) {
  const total = roundToCents(splits.reduce((sum, split) => sum + toNumber(split.shareAmount), 0));
  return roundToCents(amount) === total;
}

export function calculateSettledAmount(settlements: Settlement[]) {
  return roundToCents(settlements.reduce((sum, settlement) => sum + settlement.amount, 0));
}

export function calculateOwedAmount(transaction: Transaction, splits: TransactionSplit[]) {
  if (!transaction.is_shared) {
    return 0;
  }

  const payerId = transaction.paid_by_user_id;
  return roundToCents(
    splits.reduce((sum, split) => {
      if (split.user_id === payerId) {
        return sum;
      }

      return sum + split.share_amount;
    }, 0)
  );
}

export function calculatePendingAmount(
  transaction: Transaction,
  splits: TransactionSplit[],
  settlements: Settlement[]
) {
  const owedAmount = calculateOwedAmount(transaction, splits);
  const settledAmount = calculateSettledAmount(settlements);
  return roundToCents(Math.max(owedAmount - settledAmount, 0));
}

export function deriveTransactionStatus(
  transaction: Transaction,
  splits: TransactionSplit[],
  settlements: Settlement[]
): TransactionStatus {
  if (transaction.status === "cancelled" || transaction.status === "draft") {
    return transaction.status;
  }

  if (!transaction.is_shared || transaction.type !== "expense") {
    return "posted";
  }

  const pending = calculatePendingAmount(transaction, splits, settlements);
  const owedAmount = calculateOwedAmount(transaction, splits);

  if (pending <= 0 && owedAmount > 0) {
    return "settled";
  }

  if (pending < owedAmount) {
    return "partially_settled";
  }

  return "posted";
}

export function mapBalanceView(
  transaction: Transaction,
  splits: TransactionSplit[],
  settlements: Settlement[]
): TransactionBalanceView {
  const owedToPayer = calculateOwedAmount(transaction, splits);
  const settledAmount = calculateSettledAmount(settlements);
  const pendingAmount = roundToCents(Math.max(owedToPayer - settledAmount, 0));

  return {
    transaction_id: transaction.id,
    household_id: transaction.household_id,
    title: transaction.title,
    transaction_amount: transaction.amount,
    transaction_date: transaction.transaction_date,
    paid_by_user_id: transaction.paid_by_user_id,
    owed_to_payer: owedToPayer,
    settled_amount: settledAmount,
    pending_amount: pendingAmount
  };
}

export function calculateMemberBalances(
  transactions: Array<{ transaction: Transaction; splits: TransactionSplit[]; settlements: Settlement[] }>
) {
  const balances = new Map<string, number>();

  for (const item of transactions) {
    const payerId = item.transaction.paid_by_user_id;

    if (!payerId || !item.transaction.is_shared) {
      continue;
    }

    for (const split of item.splits) {
      if (split.user_id === payerId) {
        continue;
      }

      balances.set(split.user_id, roundToCents((balances.get(split.user_id) ?? 0) - split.share_amount));
      balances.set(payerId, roundToCents((balances.get(payerId) ?? 0) + split.share_amount));
    }

    for (const settlement of item.settlements) {
      balances.set(
        settlement.from_user_id,
        roundToCents((balances.get(settlement.from_user_id) ?? 0) + settlement.amount)
      );
      balances.set(
        settlement.to_user_id,
        roundToCents((balances.get(settlement.to_user_id) ?? 0) - settlement.amount)
      );
    }
  }

  return balances;
}

