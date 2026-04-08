import type { BudgetGoal, Category, DashboardGoal, DashboardTip } from "@/types/database";

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

const SUGGESTED_PERCENT_RULES: Array<{ pattern: RegExp; percent: number }> = [
  { pattern: /casa|hogar|alquiler|hipoteca/i, percent: 30 },
  { pattern: /supermercado|compra|mercado/i, percent: 12 },
  { pattern: /comida fuera|restaurante|ocio/i, percent: 8 },
  { pattern: /transporte|gasolina|coche|bus|tren/i, percent: 10 },
  { pattern: /salud|médico|medico|farmacia/i, percent: 6 },
  { pattern: /mascota/i, percent: 5 },
  { pattern: /tecnología|tecnologia|móvil|movil|internet/i, percent: 6 },
  { pattern: /ropa|peluquería|peluqueria|belleza/i, percent: 5 },
  { pattern: /vacaciones|viaje/i, percent: 7 },
  { pattern: /familia|bebé|bebe/i, percent: 8 }
];

function getSuggestedPercent(categoryName: string, spentAmount: number, totalIncome: number) {
  const matched = SUGGESTED_PERCENT_RULES.find((rule) => rule.pattern.test(categoryName));

  if (matched) {
    return matched.percent;
  }

  if (totalIncome <= 0) {
    return 8;
  }

  const actualPercent = (spentAmount / totalIncome) * 100;
  return Math.min(Math.max(Math.round(actualPercent || 8), 5), 15);
}

function getSuggestedTargetAmount(categoryName: string, spentAmount: number, totalIncome: number) {
  if (totalIncome > 0) {
    const suggestedPercent = getSuggestedPercent(categoryName, spentAmount, totalIncome);
    return roundToCents((totalIncome * suggestedPercent) / 100);
  }

  if (spentAmount > 0) {
    return roundToCents(spentAmount);
  }

  return 0;
}

export function buildDashboardGoals(params: {
  totalIncome: number;
  categoryExpenses: Array<{ categoryName: string; totalAmount: number }>;
  categories: Pick<Category, "id" | "name" | "color" | "icon" | "kind">[];
  savedGoals: BudgetGoal[];
}) {
  const expensesByName = new Map(params.categoryExpenses.map((item) => [item.categoryName, item.totalAmount]));
  const activeGoals = params.savedGoals.filter((goal) => goal.is_active);
  const goalMap = new Map(activeGoals.map((goal) => [goal.category_id, goal]));
  const goalCategories = params.categories.filter((category) => category.kind === "expense" || category.kind === "both");

  const goals = goalCategories
    .map((category) => {
      const savedGoal = goalMap.get(category.id);
      const spentAmount = roundToCents(expensesByName.get(category.name) ?? 0);
      const targetAmount = roundToCents(
        savedGoal?.target_amount ?? getSuggestedTargetAmount(category.name, spentAmount, params.totalIncome)
      );
      const targetPercent =
        params.totalIncome > 0
          ? roundToCents(savedGoal?.target_percent ?? (targetAmount > 0 ? (targetAmount / params.totalIncome) * 100 : 0))
          : savedGoal?.target_percent ?? null;

      if (targetAmount <= 0 && spentAmount <= 0) {
        return null;
      }

      const varianceAmount = roundToCents(spentAmount - targetAmount);
      const progressRatio = targetAmount > 0 ? spentAmount / targetAmount : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        categoryIcon: category.icon,
        spentAmount,
        targetAmount,
        targetPercent,
        progressRatio,
        varianceAmount,
        isCustom: Boolean(savedGoal),
        note: savedGoal?.note ?? null
      } satisfies DashboardGoal;
    })
    .filter(Boolean) as DashboardGoal[];

  return goals.sort((left, right) => right.spentAmount - left.spentAmount).slice(0, 6);
}

export function buildDashboardTips(params: {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  goals: DashboardGoal[];
}) {
  const tips: DashboardTip[] = [];
  const savingsTarget = roundToCents(params.totalIncome * 0.2);
  const savingsProgress = roundToCents(Math.max(params.balance, 0));

  if (params.totalIncome > 0 && savingsProgress < savingsTarget) {
    tips.push({
      id: "savings-gap",
      tone: "warning",
      title: "Ahorro por debajo del objetivo",
      description: `Con vuestros ingresos actuales, una referencia sana es guardar ${savingsTarget.toFixed(
        2
      )} EUR al mes. Ahora mismo os quedan ${savingsProgress.toFixed(2)} EUR.`
    });
  } else if (params.totalIncome > 0) {
    tips.push({
      id: "savings-on-track",
      tone: "positive",
      title: "Ahorro mensual en buen ritmo",
      description: `El balance libre del mes va alineado con un objetivo de ahorro del 20% sobre ingresos.`
    });
  }

  const exceededGoal = params.goals.find((goal) => goal.progressRatio >= 1.15);
  if (exceededGoal) {
    tips.push({
      id: `goal-${exceededGoal.categoryId}`,
      tone: exceededGoal.progressRatio >= 1.35 ? "critical" : "warning",
      title: `La categoría ${exceededGoal.categoryName} se está desviando`,
      description: `Lleva ${exceededGoal.spentAmount.toFixed(2)} EUR frente a un objetivo de ${exceededGoal.targetAmount.toFixed(
        2
      )} EUR. Ajustar esa categoría tendría impacto directo este mes.`
    });
  }

  if (params.totalIncome > 0 && params.totalExpenses / params.totalIncome > 0.9) {
    tips.push({
      id: "expense-ratio",
      tone: "critical",
      title: "Gasto mensual demasiado pegado al ingreso",
      description: "Estáis consumiendo más del 90 % del ingreso del mes. Conviene fijar topes más estrictos en una o dos categorías."
    });
  }

  if (!tips.length) {
    tips.push({
      id: "baseline",
      tone: "positive",
      title: "Panel de control activo",
      description: "Define objetivos por categoría para convertir el panel en una guía mensual y no solo en histórico."
    });
  }

  return {
    tips: tips.slice(0, 3),
    savingsTarget,
    savingsProgress
  };
}
