import type { ComponentType } from "react";
import { CreditCard, FolderKanban, LayoutDashboard, ListOrdered, PlusCircle, Settings, Wallet } from "lucide-react";

export interface AppNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/add", label: "Añadir", icon: PlusCircle },
  { href: "/transactions", label: "Movimientos", icon: ListOrdered },
  { href: "/dashboard", label: "Análisis", icon: CreditCard },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/categories", label: "Categorías", icon: FolderKanban },
  { href: "/settings", label: "Ajustes", icon: Settings }
];
