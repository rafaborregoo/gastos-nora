import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { User } from "@supabase/supabase-js";

import { calculateAccountCurrentBalance, getOpeningBalanceAmount } from "@/lib/calculations/accounts";
import type {
  Account,
  AccountMember,
  AccountWithDetails,
  Category,
  Household,
  HouseholdBundle,
  Json,
  Notification,
  Settlement
} from "@/types/database";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, getCurrentProfile } from "@/lib/queries/auth-queries";

export async function getCurrentHouseholdBundle(): Promise<HouseholdBundle | null> {
  noStore();
  const user = await getAuthenticatedUser();
  return getCurrentHouseholdBundleForUser(user);
}

async function getCurrentHouseholdBundleForUser(user: User | null): Promise<HouseholdBundle | null> {
  noStore();

  if (!user) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const membershipResponse = await supabase
    .from("household_members")
    .select("id, household_id, user_id, role, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipResponse.error) {
    throw new Error(membershipResponse.error.message);
  }

  if (!membershipResponse.data) {
    return null;
  }

  const householdResponse = await supabase
    .from("households")
    .select("*")
    .eq("id", membershipResponse.data.household_id)
    .maybeSingle();

  if (householdResponse.error) {
    throw new Error(householdResponse.error.message);
  }

  if (!householdResponse.data) {
    return null;
  }

  const household = householdResponse.data as Household;

  const membersResponse = await supabase
    .from("household_members")
    .select("id, household_id, user_id, role, status, created_at, profile:profiles(id, email, full_name, avatar_url)")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  if (membersResponse.error) {
    throw new Error(membersResponse.error.message);
  }

  return {
    household,
    members: ((membersResponse.data ?? []) as unknown[]).map((member) => {
      const record = member as {
        id: string;
        household_id: string;
        user_id: string;
        role: HouseholdBundle["members"][number]["role"];
        status: HouseholdBundle["members"][number]["status"];
        created_at: string;
        profile: Array<{
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
        }> | null;
      };

      return {
        id: record.id,
        household_id: record.household_id,
        user_id: record.user_id,
        role: record.role,
        status: record.status,
        created_at: record.created_at,
        profile: Array.isArray(record.profile) ? record.profile[0] ?? null : record.profile
      };
    })
  };
}

export async function getAppContext() {
  noStore();
  const user = await getAuthenticatedUser();
  const [profile, householdBundle] = await Promise.all([
    getCurrentProfile(user),
    getCurrentHouseholdBundleForUser(user)
  ]);

  if (user?.email && profile && hasSupabaseAdminEnv()) {
    const admin = createSupabaseAdminClient();
    const normalizedEmail = user.email.toLowerCase();
    const invitationsResponse = await admin
      .from("household_invitations")
      .select("*")
      .eq("email", normalizedEmail)
      .in("status", ["pending", "sent"]);

    if (!invitationsResponse.error) {
      for (const invitation of invitationsResponse.data ?? []) {
        const existingMember = await admin
          .from("household_members")
          .select("id")
          .eq("household_id", invitation.household_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existingMember.error && !existingMember.data) {
          await admin.from("household_members").insert({
            household_id: invitation.household_id,
            user_id: user.id,
            role: invitation.role,
            status: "active"
          });
        }

        await admin
          .from("household_invitations")
          .update({
            status: "accepted",
            accepted_by_user_id: user.id,
            accepted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", invitation.id);
      }
    }
  }

  return {
    user,
    profile,
    householdBundle
  };
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

export async function getAccounts(
  householdId?: string,
  options?: { includeInactive?: boolean }
): Promise<AccountWithDetails[]> {
  noStore();
  const context = await getCurrentHouseholdBundle();
  const id = householdId ?? context?.household.id;

  if (!id) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const accountQuery = supabase
    .from("accounts")
    .select("*")
    .eq("household_id", id)
    .order("created_at", { ascending: true });

  if (!options?.includeInactive) {
    accountQuery.eq("is_active", true);
  }

  const { data, error } = await accountQuery;

  if (error) {
    throw new Error(error.message);
  }

  const accounts = (data as Account[]) ?? [];

  if (!accounts.length) {
    return [];
  }

  const accountIds = accounts.map((account) => account.id);
  const [membersResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("account_members")
      .select(
        "account_id, user_id, role, created_at, profile:profiles(id, email, full_name, avatar_url)"
      )
      .in("account_id", accountIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, account_id, type, amount, metadata, status")
      .eq("household_id", id)
      .neq("status", "cancelled")
  ]);

  if (membersResponse.error && !isAccountMembersTableMissing(membersResponse.error)) {
    throw new Error(membersResponse.error.message);
  }

  if (transactionsResponse.error) {
    throw new Error(transactionsResponse.error.message);
  }

  const memberMap = new Map<string, AccountMember[]>();
  const fallbackMemberOptions =
    context?.members.map((member) => ({
      user_id: member.user_id,
      profile: member.profile
    })) ?? [];

  if (!membersResponse.error) {
    for (const row of (membersResponse.data ?? []) as Array<{
      account_id: string;
      user_id: string;
      role: AccountMember["role"];
      created_at: string;
      profile:
        | Array<{
            id: string;
            email: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }>
        | {
            id: string;
            email: string | null;
            full_name: string | null;
            avatar_url: string | null;
          }
        | null;
    }>) {
      const profile = Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile;
      const current = memberMap.get(row.account_id) ?? [];
      current.push({
        account_id: row.account_id,
        user_id: row.user_id,
        role: row.role,
        created_at: row.created_at,
        profile
      });
      memberMap.set(row.account_id, current);
    }
  }

  const transactionMap = new Map<
    string,
    Array<{
      accountId: string;
      type: "expense" | "income" | "transfer" | "adjustment";
      amount: number;
      metadata: Json;
    }>
  >();

  for (const row of (transactionsResponse.data ?? []) as Array<{
    account_id: string;
    type: "expense" | "income" | "transfer" | "adjustment";
    amount: number;
    metadata: Json;
  }>) {
    const sourceAccountId = row.account_id;
    const metadata = row.metadata ?? {};
    const current = transactionMap.get(sourceAccountId) ?? [];
    current.push({
      accountId: sourceAccountId,
      type: row.type,
      amount: Number(row.amount),
      metadata
    });
    transactionMap.set(sourceAccountId, current);

    if (row.type === "transfer" && typeof metadata === "object" && !Array.isArray(metadata)) {
      const destinationAccountId =
        typeof metadata.destination_account_id === "string" ? metadata.destination_account_id : null;

      if (destinationAccountId) {
        const destinationTransactions = transactionMap.get(destinationAccountId) ?? [];
        destinationTransactions.push({
          accountId: sourceAccountId,
          type: row.type,
          amount: Number(row.amount),
          metadata
        });
        transactionMap.set(destinationAccountId, destinationTransactions);
      }
    }
  }

  return accounts.map((account) => {
    const derivedMembers =
      memberMap.get(account.id) ??
      (account.owner_user_id
        ? fallbackMemberOptions
            .filter((member) => member.user_id === account.owner_user_id)
            .map((member) => ({
              account_id: account.id,
              user_id: member.user_id,
              role: "owner" as const,
              created_at: account.created_at,
              profile: member.profile
            }))
        : []);
    const transactions = transactionMap.get(account.id) ?? [];

    return {
      ...account,
      members: derivedMembers,
      opening_balance: getOpeningBalanceAmount(transactions, account.id),
      current_balance: calculateAccountCurrentBalance(transactions, account.id)
    };
  });
}

export async function getCategories(householdId?: string): Promise<Category[]> {
  noStore();
  const context = await getCurrentHouseholdBundle();
  const id = householdId ?? context?.household.id;

  if (!id) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", id)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Category[]) ?? [];
}

export async function getSettlements(householdId?: string): Promise<Settlement[]> {
  noStore();
  const context = await getCurrentHouseholdBundle();
  const id = householdId ?? context?.household.id;

  if (!id) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("household_id", id)
    .order("settlement_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Settlement[]) ?? [];
}

export async function getNotifications(limit = 50): Promise<Notification[]> {
  noStore();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as Notification[]) ?? [];
}

export async function getUnreadNotificationsCount() {
  noStore();
  const user = await getAuthenticatedUser();

  if (!user) {
    return 0;
  }

  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
