import type { Json, TransactionType } from "@/types/database";

interface AccountTransactionSummary {
  type: TransactionType;
  amount: number;
  metadata: Json;
  accountId: string;
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

function getDestinationAccountId(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata.destination_account_id;
  return typeof value === "string" ? value : null;
}

export function getOpeningBalanceAmount(transactions: AccountTransactionSummary[], accountId?: string) {
  const openingBalance = transactions.find(
    (transaction) => transaction.accountId === accountId && isOpeningBalanceMetadata(transaction.metadata)
  );
  return roundToCents(openingBalance?.amount ?? 0);
}

export function calculateAccountCurrentBalance(transactions: AccountTransactionSummary[], accountId: string) {
  return roundToCents(
    transactions.reduce((total, transaction) => {
      if (transaction.type === "expense") {
        return transaction.accountId === accountId ? total - transaction.amount : total;
      }

      if (transaction.type === "income" || transaction.type === "adjustment") {
        return transaction.accountId === accountId ? total + transaction.amount : total;
      }

      if (transaction.type === "transfer") {
        const destinationAccountId = getDestinationAccountId(transaction.metadata);

        if (transaction.accountId === accountId) {
          return total - transaction.amount;
        }

        if (destinationAccountId === accountId) {
          return total + transaction.amount;
        }
      }

      return total;
    }, 0)
  );
}
