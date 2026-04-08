import type { CategoryFormValues } from "@/types/forms";

export const DEFAULT_EXPENSE_CATEGORIES: CategoryFormValues[] = [
  { name: "Supermercado", kind: "expense", color: "#16a34a", icon: "shopping-basket" },
  { name: "Casa", kind: "expense", color: "#ea580c", icon: "house" },
  { name: "Comida fuera", kind: "expense", color: "#f59e0b", icon: "utensils" },
  { name: "Transporte", kind: "expense", color: "#0284c7", icon: "car" },
  { name: "Ocio", kind: "expense", color: "#8b5cf6", icon: "sparkles" }
];

export const DEFAULT_INCOME_CATEGORIES: CategoryFormValues[] = [
  { name: "Nomina", kind: "income", color: "#16a34a", icon: "wallet" },
  { name: "Transferencia", kind: "income", color: "#0f766e", icon: "arrow-down-left" }
];

