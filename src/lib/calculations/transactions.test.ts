import { describe, expect, it } from "vitest";

import { buildSplits, calculateMemberBalances } from "./transactions";
import type { Settlement, Transaction } from "../../types/database";

const baseTransaction: Transaction = {
  id: "tx-1",
  household_id: "home-1",
  created_by: "user-a",
  account_id: "account-1",
  category_id: null,
  type: "expense",
  title: "Compra",
  description: null,
  amount: 60,
  currency: "EUR",
  paid_by_user_id: "user-a",
  beneficiary_user_id: null,
  is_shared: true,
  split_method: "equal",
  transaction_date: "2026-04-26",
  status: "posted",
  external_ref: null,
  metadata: {},
  created_at: "2026-04-26T00:00:00.000Z",
  updated_at: "2026-04-26T00:00:00.000Z"
};

describe("transaction calculations", () => {
  it("builds equal splits", () => {
    expect(
      buildSplits({
        amount: 60,
        splitMethod: "equal",
        memberIds: ["user-a", "user-b"]
      })
    ).toEqual([
      { userId: "user-a", shareAmount: 30, sharePercent: 50, isDebtor: true },
      { userId: "user-b", shareAmount: 30, sharePercent: 50, isDebtor: true }
    ]);
  });

  it("builds percentage splits from manual rows", () => {
    expect(
      buildSplits({
        amount: 60,
        splitMethod: "percentage",
        memberIds: [],
        manualSplits: [
          { userId: "user-a", shareAmount: 0, sharePercent: 25 },
          { userId: "user-b", shareAmount: 0, sharePercent: 75 }
        ]
      })
    ).toEqual([
      { userId: "user-a", sharePercent: 25, shareAmount: 15, isDebtor: true },
      { userId: "user-b", sharePercent: 75, shareAmount: 45, isDebtor: true }
    ]);
  });

  it("builds fixed splits from manual rows", () => {
    expect(
      buildSplits({
        amount: 60,
        splitMethod: "fixed",
        memberIds: [],
        manualSplits: [
          { userId: "user-a", shareAmount: 20 },
          { userId: "user-b", shareAmount: 40 }
        ]
      })
    ).toEqual([
      { userId: "user-a", shareAmount: 20, sharePercent: 33.33, isDebtor: true },
      { userId: "user-b", shareAmount: 40, sharePercent: 66.67, isDebtor: true }
    ]);
  });

  it("calculates member balances after a partial settlement", () => {
    const settlement: Settlement = {
      id: "settlement-1",
      household_id: "home-1",
      transaction_id: "tx-1",
      from_user_id: "user-b",
      to_user_id: "user-a",
      amount: 20,
      currency: "EUR",
      settlement_date: "2026-04-26",
      method: "bizum",
      note: null,
      created_by: "user-b",
      created_at: "2026-04-26T00:00:00.000Z"
    };

    const balances = calculateMemberBalances([
      {
        transaction: baseTransaction,
        splits: [
          {
            id: "split-a",
            transaction_id: "tx-1",
            user_id: "user-a",
            share_amount: 30,
            share_percent: 50,
            is_debtor: true,
            created_at: "2026-04-26T00:00:00.000Z"
          },
          {
            id: "split-b",
            transaction_id: "tx-1",
            user_id: "user-b",
            share_amount: 30,
            share_percent: 50,
            is_debtor: true,
            created_at: "2026-04-26T00:00:00.000Z"
          }
        ],
        settlements: [settlement]
      }
    ]);

    expect(balances.get("user-a")).toBe(10);
    expect(balances.get("user-b")).toBe(-10);
  });
});
