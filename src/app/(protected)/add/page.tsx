import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SettlementForm } from "@/features/settlements/settlement-form";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { getAccounts, getCategories, getCurrentHouseholdBundle } from "@/lib/queries/household-queries";
import { getTransactionById } from "@/lib/queries/transaction-queries";

export default async function AddPage({
  searchParams
}: {
  searchParams?: { mode?: string; id?: string; transactionId?: string };
}) {
  const [householdBundle, accounts, categories, initialTransaction, settlementTransaction] = await Promise.all([
    getCurrentHouseholdBundle(),
    getAccounts(),
    getCategories(),
    searchParams?.id ? getTransactionById(searchParams.id) : Promise.resolve(null),
    searchParams?.transactionId ? getTransactionById(searchParams.transactionId) : Promise.resolve(null)
  ]);

  const members =
    householdBundle?.members.map((member) => ({
      id: member.user_id,
      label: member.profile?.full_name ?? member.profile?.email ?? member.user_id
    })) ?? [];
  const mode = searchParams?.mode === "settlement" ? "settlement" : "transaction";

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "settlement" ? "Liquidación / Bizum" : "Añadir movimiento"}
        description="Formulario optimizado para móvil con validación fuerte y reglas contables centralizadas."
      />
      {!accounts.length && mode === "transaction" ? (
        <Card className="space-y-3 border-warning/40 bg-warning/10">
          <h2 className="text-sm font-semibold">Necesitas una cuenta antes de registrar movimientos</h2>
          <p className="text-sm text-muted-foreground">
            Crea una cuenta personal o compartida. Las cuentas compartidas deben tener personas vinculadas.
          </p>
          <Link className="inline-flex text-sm font-semibold text-primary" href="/accounts">
            Ir a Cuentas
          </Link>
        </Card>
      ) : mode === "settlement" ? (
        <SettlementForm
          members={members}
          transactionId={settlementTransaction?.id}
          defaultFromUserId={settlementTransaction?.splits.find((split) => split.user_id !== settlementTransaction.paid_by_user_id)?.user_id}
          defaultToUserId={settlementTransaction?.paid_by_user_id ?? undefined}
        />
      ) : (
        <TransactionForm accounts={accounts} categories={categories} members={members} initialTransaction={initialTransaction} />
      )}
    </div>
  );
}
