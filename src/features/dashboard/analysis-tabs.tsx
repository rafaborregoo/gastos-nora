"use client";

import { useMemo, useState } from "react";

import { ExpensePieChart } from "@/components/charts/expense-pie-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters/currency";
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Gráficos por cuenta</h2>
            <p className="text-sm text-muted-foreground">Cambias entre tus cuentas, las compartidas y una vista conjunta sin mezclar privadas ajenas.</p>
          </div>
          <Badge intent="info">{selectedScope.accountCount} cuenta{selectedScope.accountCount === 1 ? "" : "s"}</Badge>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {scopes.map((scope) => (
            <Button
              key={scope.id}
              type="button"
              variant={scope.id === selectedScope.id ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedScopeId(scope.id)}
            >
              {scope.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{selectedScope.label}</h3>
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
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h3 className="mb-2 text-base font-semibold">Gasto por categoría</h3>
          {selectedScope.expenseByCategory.length ? (
            <ExpensePieChart data={selectedScope.expenseByCategory} />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-[24px] border border-dashed border-border bg-background/60 px-6 text-center text-sm text-muted-foreground">
              No hay gasto por categoría en esta vista durante el mes seleccionado.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-base font-semibold">Evolución mensual</h3>
          <MonthlyTrendChart data={selectedScope.monthlyTrend} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Gastos del mes</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(selectedScope.totalExpenses)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Ingresos del mes</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(selectedScope.totalIncome)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Saldo actual</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCurrency(selectedScope.currentBalance)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Balance vivo de las cuentas visibles en esta pestaña.</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Actividad del mes</p>
          <p className="mt-3 text-2xl font-semibold sm:text-3xl">{selectedScope.transactionCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedScope.pendingAmount > 0
              ? `Pendiente de liquidar: ${formatCurrency(selectedScope.pendingAmount)}`
              : "Sin pendiente de liquidar"}
          </p>
        </Card>
      </div>
    </section>
  );
}
