import Link from "next/link";
import { ArrowRight, Bell, PieChart, PlusCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import { getDashboardData } from "@/lib/queries/dashboard-queries";
import { getAppContext } from "@/lib/queries/household-queries";
import { getTransactions } from "@/lib/queries/transaction-queries";

const currentMonth = new Date().toISOString().slice(0, 7);

export default async function HomePage() {
  const [{ householdBundle }, dashboard, myTransactions] = await Promise.all([
    getAppContext(),
    getDashboardData(currentMonth),
    getTransactions({ month: currentMonth, ownership: "mine" })
  ]);

  if (!dashboard) {
    return <EmptyState title="Sin datos todavía" description="Añade tus primeros movimientos para empezar a ver tu resumen." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`NORA Gastos${householdBundle ? ` · ${householdBundle.household.name}` : ""}`}
        description="Tu resumen mensual primero, y el contexto del hogar después para no mezclar datos."
        action={
          <div className="grid grid-cols-2 gap-3 md:flex">
            <Link
              href="/add?mode=transaction"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="h-4 w-4" />
              Añadir
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
            >
              <PieChart className="h-4 w-4" />
              Análisis
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Tus gastos del mes</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.myExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tus ingresos del mes</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.myIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tu posición neta</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.myNetPosition)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {dashboard.myNetPosition >= 0
              ? `Te deben ${formatCurrency(dashboard.myNetPosition)}`
              : `Debes ${formatCurrency(Math.abs(dashboard.myNetPosition))}`}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tus movimientos</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{dashboard.myRecordedTransactions}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {dashboard.myLastActivityAt ? `Último: ${formatDisplayDate(dashboard.myLastActivityAt, "d MMM yyyy, HH:mm")}` : "Sin actividad aún"}
          </p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Resumen visible</h2>
          <p className="text-sm text-muted-foreground">Incluye tus cuentas y las compartidas, sin mezclar privadas ajenas.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-4">
            <p className="text-sm text-muted-foreground">Gasto visible del mes</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(dashboard.totalExpenses)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-4">
            <p className="text-sm text-muted-foreground">Ingreso visible del mes</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(dashboard.totalIncome)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-4">
            <p className="text-sm text-muted-foreground">Balance visible</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(dashboard.balance)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tus últimos movimientos</h2>
              <p className="text-sm text-muted-foreground">Solo se muestran los que has registrado o pagado tú.</p>
            </div>
            <Link href="/transactions" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {myTransactions.length ? (
              myTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-border bg-background/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{transaction.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDisplayDate(transaction.transaction_date)}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-border bg-background/60 px-4 py-4 text-sm text-muted-foreground">
                Aún no tienes movimientos propios este mes.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Accesos rápidos</h2>
            <p className="text-sm text-muted-foreground">Las acciones que más vas a usar cada día.</p>
          </div>
          <div className="grid gap-3">
            <Link href="/add?mode=transaction" className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold">
              Añadir gasto o ingreso
            </Link>
            <Link href="/add?mode=settlement" className="rounded-2xl border border-border px-4 py-4 text-sm font-semibold">
              Registrar Bizum o liquidación
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
