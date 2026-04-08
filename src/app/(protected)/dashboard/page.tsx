import { ExpensePieChart } from "@/components/charts/expense-pie-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BudgetPlanner } from "@/features/dashboard/budget-planner";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import { getBudgetGoals } from "@/lib/queries/budget-goal-queries";
import { getDashboardData } from "@/lib/queries/dashboard-queries";

const currentMonth = new Date().toISOString().slice(0, 7);

export default async function DashboardPage() {
  const [dashboard, savedGoals] = await Promise.all([getDashboardData(currentMonth), getBudgetGoals()]);

  if (!dashboard) {
    return <EmptyState title="Sin dashboard todavia" description="Necesitas movimientos para empezar a ver analitica mensual." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Analitica mensual, objetivos por categoria y tips para mejorar el margen." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Gasto mensual</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard.totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Ingreso mensual</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard.totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Balance mensual</p>
          <p className="mt-3 text-3xl font-semibold">{formatCurrency(dashboard.balance)}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Ahorro objetivo</h2>
            <p className="text-sm text-muted-foreground">Referencia automatica del 20% del ingreso del mes.</p>
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
            <h2 className="text-lg font-semibold">Tips del mes</h2>
            <p className="text-sm text-muted-foreground">Consejos generados desde vuestros ingresos, gasto y categorias.</p>
          </div>
          <div className="space-y-3">
            {dashboard.tips.map((tip) => (
              <div key={tip.id} className="rounded-[24px] border border-border bg-background/70 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge intent={tip.tone === "positive" ? "success" : tip.tone === "critical" ? "danger" : "warning"}>
                    {tip.tone === "positive" ? "En forma" : tip.tone === "critical" ? "Urgente" : "Atencion"}
                  </Badge>
                  <p className="font-medium">{tip.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BudgetPlanner dashboard={dashboard} savedGoals={savedGoals} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Gasto por categoria</h2>
          <ExpensePieChart data={dashboard.expenseByCategory} />
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Evolucion mensual</h2>
          <MonthlyTrendChart data={dashboard.monthlyTrend} />
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Pendientes por transaccion</h2>
        <div className="space-y-3">
          {dashboard.pendingByTransaction.map((item) => (
            <div key={item.transaction_id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{formatDisplayDate(item.transaction_date)}</p>
              </div>
              <p className="font-semibold">{formatCurrency(item.pending_amount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

