import "server-only";

import type { HouseholdInvitation } from "@/types/database";
import { createSupabaseAdminClient, hasSupabaseServiceRoleEnv } from "@/lib/supabase/admin";
import { getAppContext } from "@/lib/queries/household-queries";

export async function getCurrentHouseholdInvitations(): Promise<HouseholdInvitation[]> {
  const { user, householdBundle } = await getAppContext();

  if (!user || !householdBundle || householdBundle.household.owner_user_id !== user.id || !hasSupabaseServiceRoleEnv()) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("household_invitations")
    .select("*")
    .eq("household_id", householdBundle.household.id)
    .in("status", ["pending", "sent"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as HouseholdInvitation[]) ?? [];
}
