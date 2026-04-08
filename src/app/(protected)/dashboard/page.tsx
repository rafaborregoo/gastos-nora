import { ExpensePieChart } from "@/components/charts/expense-pie-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { BudgetPlanner } from "@/features/dashboard/budget-planner";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import { getBudgetGoals } from "@/lib/queries/budget-goal-queries";
import { getDashboardData } from "@/lib/queries/dashboard-queries";

const currentMonth = new Date().toISOString().slice(0, 7);

function getActivityBadge(lastActivityAt: string | null) {
  if (!lastActivityAt) {
    return { label: "Sin actividad", intent: "neutral" as const };
  }

  const now = Date.now();
  const diffHours = Math.abs(now - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return { label: "Activa hoy", intent: "success" as const };
  }

  if (diffHours < 24 * 7) {
    return { label: "Activa esta semana", intent: "info" as const };
  }

  return { label: "Actividad antigua", intent: "warning" as const };
}

export default async function DashboardPage() {
  const [dashboard, savedGoals] = await Promise.all([getDashboardData(currentMonth), getBudgetGoals()]);

  if (!dashboard) {
    return <EmptyState title="Sin análisis todavía" description="Necesitas movimientos para empezar a ver analítica mensual." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Análisis" description="Analítica mensual, actividad por persona, objetivos por categoría y consejos." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Gasto mensual</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Ingreso mensual</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Balance mensual</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(dashboard.balance)}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Ahorro objetivo</h2>
            <p className="text-sm text-muted-foreground">Referencia automática del 20 % del ingreso del mes.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Objetivo</span>
              <span className="font-semibold">{formatCurrency(dashboard.savingsTarget)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${dashboard.savingsProgress >= dashboard.savingsTarget ? "bg-primary" : "bg-secondary"}`}
                style={{
                  width: `${dashboard.savingsTarget > 0 ? Math.min((dashboard.savingsProgress / dashboard.savingsTarget) * 100, 100) : 0}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Libre este mes</span>
              <span>{formatCurrency(dashboard.savingsProgress)}</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Consejos del mes</h2>
            <p className="text-sm text-muted-foreground">Consejos generados a partir de ingresos, gasto y categorías.</p>
          </div>
          <div className="space-y-3">
            {dashboard.tips.map((tip) => (
              <div key={tip.id} className="rounded-[24px] border border-border bg-background/70 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge intent={tip.tone === "positive" ? "success" : tip.tone === "critical" ? "danger" : "warning"}>
                    {tip.tone === "positive" ? "En forma" : tip.tone === "critical" ? "Urgente" : "Atención"}
                  </Badge>
                  <p className="font-medium">{tip.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Actividad por persona</h2>
          <p className="text-sm text-muted-foreground">
            Aquí ves quién está más activa, cuántos movimientos ha registrado y cuál fue su última actividad. No es presencia en tiempo real.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.memberStats.map((member) => {
            const activity = getActivityBadge(member.lastActivityAt);

            return (
              <div key={member.userId} className="rounded-[24px] border border-border bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-medium">{member.label}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge intent={member.role === "owner" ? "info" : "neutral"}>
                      {member.role === "owner" ? "Propietaria/o" : "Miembro"}
                    </Badge>
                    <Badge intent={activity.intent}>{activity.label}</Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Movimientos registrados</span>
                    <span className="font-semibold">{member.recordedTransactions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Última actividad</span>
                    <span className="font-semibold">
                      {member.lastActivityAt ? formatDisplayDate(member.lastActivityAt, "d MMM yyyy, HH:mm") : "Sin datos"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Gastos pagados</span>
                    <span className="font-semibold">{formatCurrency(member.totalPaidExpenses)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Ingresos registrados</span>
                    <span className="font-semibold">{formatCurrency(member.totalRecordedIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Posición neta</span>
                    <span className={`font-semibold ${member.netPosition >= 0 ? "text-success" : "text-danger"}`}>
                      {member.netPosition >= 0
                        ? `Le deben ${formatCurrency(member.netPosition)}`
                        : `Debe ${formatCurrency(Math.abs(member.netPosition))}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <BudgetPlanner dashboard={dashboard} savedGoals={savedGoals} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Gasto por categoría</h2>
          <ExpensePieChart data={dashboard.expenseByCategory} />
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Evolución mensual</h2>
          <MonthlyTrendChart data={dashboard.monthlyTrend} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Pendientes por transacción</h2>
        <div className="space-y-3">
          {dashboard.pendingByTransaction.map((item) => (
            <div key={item.transaction_id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{formatDisplayDate(item.transaction_date)}</p>
              </div>
              <p className="shrink-0 font-semibold">{formatCurrency(item.pending_amount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
