import type { ComponentType } from "react";
import { CreditCard, FolderKanban, LayoutDashboard, ListOrdered, PlusCircle, Settings, Wallet } from "lucide-react";

export interface AppNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/add", label: "Anadir", icon: PlusCircle },
  { href: "/transactions", label: "Movimientos", icon: ListOrdered },
  { href: "/dashboard", label: "Dashboard", icon: CreditCard },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/categories", label: "Categorias", icon: FolderKanban },
  { href: "/settings", label: "Ajustes", icon: Settings }
];

