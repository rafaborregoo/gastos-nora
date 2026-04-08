"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertBudgetGoalAction } from "@/lib/actions/budget-goal-actions";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatCurrency } from "@/lib/formatters/currency";
import { budgetGoalSchema } from "@/lib/validators/budget-goals";
import type { AppDashboard, BudgetGoal, DashboardGoal } from "@/types/database";
import type { BudgetGoalFormValues } from "@/types/forms";

export function BudgetPlanner({
  dashboard,
  savedGoals
}: {
  dashboard: AppDashboard;
  savedGoals: BudgetGoal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<BudgetGoalFormValues>({
    resolver: zodResolver(budgetGoalSchema),
    defaultValues: {
      categoryId: dashboard.availableGoalCategories[0]?.id ?? "",
      targetAmount: 100,
      note: ""
    }
  });

  const goalByCategoryId = new Map(savedGoals.map((goal) => [goal.category_id, goal]));
  const selectedCategoryId = form.watch("categoryId");
  const selectedAmount = form.watch("targetAmount") ?? 0;
  const selectedGoal = dashboard.goals.find((goal) => goal.categoryId === selectedCategoryId);
  const projectedVariance = selectedGoal ? selectedGoal.spentAmount - selectedAmount : 0;

  const prefilling = (goal: DashboardGoal) => {
    const savedGoal = goalByCategoryId.get(goal.categoryId);

    form.reset({
      id: savedGoal?.id,
      categoryId: goal.categoryId,
      targetAmount: goal.targetAmount,
      targetPercent: goal.targetPercent ?? undefined,
      note: savedGoal?.note ?? goal.note ?? ""
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {dashboard.goals.map((goal) => {
          const Icon = getCategoryIcon(goal.categoryIcon);
          const isExceeded = goal.progressRatio >= 1;
          const remainingAmount = Math.max(goal.targetAmount - goal.spentAmount, 0);

          return (
            <Card key={goal.categoryId} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: goal.categoryColor ?? "#64748b" }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">{goal.categoryName}</p>
                    <p className="text-sm text-muted-foreground">Límite mensual {formatCurrency(goal.targetAmount)}</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => prefilling(goal)}>
                  Ajustar
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gastado este mes</span>
                  <span className={isExceeded ? "font-semibold text-danger" : "font-semibold"}>
                    {formatCurrency(goal.spentAmount)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${isExceeded ? "bg-danger" : "bg-primary"}`}
                    style={{ width: `${Math.min(goal.progressRatio * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goal.isCustom ? "Límite personalizado" : "Límite sugerido"}</span>
                  <span>
                    {isExceeded ? `Te pasas ${formatCurrency(goal.varianceAmount)}` : `Te quedan ${formatCurrency(remainingAmount)}`}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Editar objetivos</h2>
          <p className="text-sm text-muted-foreground">Define un límite mensual en euros por categoría.</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await upsertBudgetGoalAction(values);

              if (!result.ok) {
                toast.error(result.message);
                return;
              }

              toast.success(result.message);
              form.reset({
                categoryId: dashboard.availableGoalCategories[0]?.id ?? "",
                targetAmount: 100,
                note: ""
              });
              router.refresh();
            });
          })}
        >
          <input type="hidden" {...form.register("id")} />
          <FormField label="Categoría" error={form.formState.errors.categoryId?.message}>
            <Select {...form.register("categoryId")}>
              {dashboard.availableGoalCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Límite mensual" error={form.formState.errors.targetAmount?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              {...form.register("targetAmount", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Resumen rápido">
            <Input
              value={
                selectedGoal
                  ? projectedVariance > 0
                    ? `Con el gasto actual te pasas ${formatCurrency(projectedVariance)}`
                    : `Con el gasto actual te quedan ${formatCurrency(Math.abs(projectedVariance))}`
                  : `Nuevo límite mensual: ${formatCurrency(selectedAmount)}`
              }
              disabled
            />
          </FormField>
          <FormField label="Nota interna" error={form.formState.errors.note?.message}>
            <Textarea rows={3} placeholder="Ej: no pasar de dos cenas fuera por semana" {...form.register("note")} />
          </FormField>
          <Button type="submit" disabled={isPending}>
            Guardar objetivo
          </Button>
        </form>
      </Card>
    </div>
  );
}
