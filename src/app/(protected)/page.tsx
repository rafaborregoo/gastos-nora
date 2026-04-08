import Link from "next/link";
import { ArrowRight, Bell, PieChart, PlusCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { calculateMemberBalances } from "@/lib/calculations/transactions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import { getDashboardData } from "@/lib/queries/dashboard-queries";
import { getAppContext } from "@/lib/queries/household-queries";
import { getTransactions } from "@/lib/queries/transaction-queries";

const currentMonth = new Date().toISOString().slice(0, 7);

export default async function HomePage() {
  const [{ user, householdBundle }, dashboard, transactions] = await Promise.all([
    getAppContext(),
    getDashboardData(currentMonth),
    getTransactions({ month: currentMonth })
  ]);

  const balances = calculateMemberBalances(
    transactions.map((transaction) => ({
      transaction,
      splits: transaction.splits,
      settlements: transaction.settlements
    }))
  );

  const currentBalance = user ? balances.get(user.id) ?? 0 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`NORA Gastos${householdBundle ? ` · ${householdBundle.household.name}` : ""}`}
        description="Resumen mensual, balances pendientes y accesos rapidos para registrar movimientos."
        action={
          <div className="flex gap-3">
            <Link
              href="/add?mode=transaction"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="h-4 w-4" />
              Anadir
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
            >
              <PieChart className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Gastos del mes</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard?.totalExpenses ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Ingresos del mes</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard?.totalIncome ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard?.balance ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Mi posicion neta</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(currentBalance)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentBalance >= 0
              ? `Me deben ${formatCurrency(currentBalance)}`
              : `Debo ${formatCurrency(Math.abs(currentBalance))}`}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ultimos movimientos</h2>
              <p className="text-sm text-muted-foreground">Los registros mas recientes del espacio activo.</p>
            </div>
            <Link href="/transactions" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{transaction.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDisplayDate(transaction.transaction_date)}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Accesos rapidos</h2>
            <p className="text-sm text-muted-foreground">Las acciones que mas vas a usar cada dia.</p>
          </div>
          <div className="grid gap-3">
            <Link href="/add?mode=transaction" className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold">
              Anadir gasto o ingreso
            </Link>
            <Link href="/add?mode=settlement" className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold">
              Registrar Bizum o liquidacion
            </Link>
            <Link href="/notifications" className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold">
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Revisar notificaciones
              </span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

