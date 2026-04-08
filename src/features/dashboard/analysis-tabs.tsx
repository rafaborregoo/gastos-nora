"use client";

import { useMemo, useState } from "react";

import { ExpensePieChart } from "@/components/charts/expense-pie-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
import { cn } from "@/lib/utils";
import type { DashboardAnalysisScope } from "@/types/database";

export function AnalysisTabs({ scopes }: { scopes: DashboardAnalysisScope[] }) {
  const [selectedScopeId, setSelectedScopeId] = useState(scopes[0]?.id ?? "");

  const selectedScope = useMemo(() => {
    return scopes.find((scope) => scope.id === selectedScopeId) ?? scopes[0];
  }, [scopes, selectedScopeId]);

  if (!selectedScope) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gráficos por cuenta</h2>
            <p className="text-sm text-muted-foreground">Empiezas por los gráficos y cambias entre tus cuentas o las compartidas sin mezclar privadas ajenas.</p>
          </div>
          <Badge intent="info">{selectedScope.accountCount} cuenta{selectedScope.accountCount === 1 ? "" : "s"}</Badge>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2 rounded-full border border-border bg-card/80 p-1 shadow-soft">
            {scopes.map((scope) => (
              <Button
                key={scope.id}
                type="button"
                variant={scope.id === selectedScope.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "shrink-0 rounded-full px-4",
                  scope.id === selectedScope.id ? "shadow-none" : "text-muted-foreground"
                )}
                onClick={() => setSelectedScopeId(scope.id)}
              >
                {scope.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold sm:text-lg">{selectedScope.label}</h3>
            <p className="text-sm text-muted-foreground">{selectedScope.description}</p>
          </div>
          <Badge intent={selectedScope.kind === "shared" ? "info" : selectedScope.kind === "account" ? "success" : "neutral"}>
            {selectedScope.kind === "shared"
              ? "Compartidas"
              : selectedScope.kind === "personal"
                ? "Personales"
                : selectedScope.kind === "account"
                  ? "Cuenta"
                  : "Vista"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[22px] border border-border bg-background/70 px-3 py-3">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="mt-2 text-lg font-semibold sm:text-2xl">{formatCurrency(selectedScope.totalExpenses)}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background/70 px-3 py-3">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="mt-2 text-lg font-semibold sm:text-2xl">{formatCurrency(selectedScope.totalIncome)}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background/70 px-3 py-3">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="mt-2 text-lg font-semibold sm:text-2xl">{formatCurrency(selectedScope.currentBalance)}</p>
          </div>
          <div className="rounded-[22px] border border-border bg-background/70 px-3 py-3">
            <p className="text-xs text-muted-foreground">Movimientos</p>
            <p className="mt-2 text-lg font-semibold sm:text-2xl">{selectedScope.transactionCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedScope.pendingAmount > 0
                ? `Pendiente: ${formatCurrency(selectedScope.pendingAmount)}`
                : "Sin pendiente"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-2 text-base font-semibold">Gasto por categoría</h3>
          {selectedScope.expenseByCategory.length ? (
            <ExpensePieChart data={selectedScope.expenseByCategory} />
          ) : (
            <div className="flex h-60 items-center justify-center rounded-[24px] border border-dashed border-border bg-background/60 px-6 text-center text-sm text-muted-foreground sm:h-72">
              No hay gasto por categoría en esta vista durante el mes seleccionado.
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-2 text-base font-semibold">Evolución mensual</h3>
          <MonthlyTrendChart data={selectedScope.monthlyTrend} />
        </Card>
      </div>
    </section>
  );
}
