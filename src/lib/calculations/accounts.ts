import type { Json, TransactionType } from "@/types/database";

interface AccountTransactionSummary {
  type: TransactionType;
  amount: number;
  metadata: Json;
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function isOpeningBalanceMetadata(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  return metadata.system === "opening_balance";
}

export function getOpeningBalanceAmount(transactions: AccountTransactionSummary[]) {
  const openingBalance = transactions.find((transaction) => isOpeningBalanceMetadata(transaction.metadata));
  return roundToCents(openingBalance?.amount ?? 0);
}

export function calculateAccountCurrentBalance(transactions: AccountTransactionSummary[]) {
  return roundToCents(
    transactions.reduce((total, transaction) => {
      if (transaction.type === "expense") {
        return total - transaction.amount;
      }

      if (transaction.type === "income" || transaction.type === "adjustment") {
        return total + transaction.amount;
      }

      return total;
    }, 0)
  );
}

