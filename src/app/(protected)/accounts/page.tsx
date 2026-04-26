import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AccountManager } from "@/features/accounts/account-manager";
import { getAccounts, getAppContext, getCurrentHouseholdBundle } from "@/lib/queries/household-queries";

export default async function AccountsPage() {
  const [accounts, householdBundle, context] = await Promise.all([
    getAccounts(undefined, { includeInactive: true }),
    getCurrentHouseholdBundle(),
    getAppContext()
  ]);
  const members =
    householdBundle?.members.map((member) => ({
      id: member.user_id,
      label: member.profile?.full_name ?? member.profile?.email ?? member.user_id
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas"
        description="Gestionas tus cuentas personales y las compartidas. Las privadas de otras personas no aparecen aquí."
      />
      {members.length < 2 ? (
        <Card className="space-y-2 border-warning/40 bg-warning/10">
          <h2 className="text-sm font-semibold">Solo hay una persona activa en este hogar</h2>
          <p className="text-sm text-muted-foreground">
            Invita o cambia al hogar correcto desde Ajustes para poder vincular cuentas y repartir gastos entre dos personas.
          </p>
        </Card>
      ) : null}
      <AccountManager
        accounts={accounts}
        members={members}
        currentUserId={context.user?.id}
        currentUserLabel={context.profile?.full_name ?? context.profile?.email ?? "Mi cuenta"}
      />
    </div>
  );
}
