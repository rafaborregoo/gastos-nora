import { PageHeader } from "@/components/ui/page-header";
import { AccountManager } from "@/features/accounts/account-manager";
import { getAccounts, getCurrentHouseholdBundle } from "@/lib/queries/household-queries";

export default async function AccountsPage() {
  const [accounts, householdBundle] = await Promise.all([getAccounts(undefined, { includeInactive: true }), getCurrentHouseholdBundle()]);
  const members =
    householdBundle?.members.map((member) => ({
      id: member.user_id,
      label: member.profile?.full_name ?? member.profile?.email ?? member.user_id
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Cuentas" description="Gestiona titulares, personas vinculadas, saldo inicial y archivado de cada cuenta." />
      <AccountManager accounts={accounts} members={members} />
    </div>
  );
}
