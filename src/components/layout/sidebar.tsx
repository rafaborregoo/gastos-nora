"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { APP_NAV_ITEMS } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

export function Sidebar({ householdName }: { householdName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-8 rounded-[32px] border border-border bg-card/90 p-6 shadow-soft backdrop-blur md:flex">
      <Logo />
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Hogar activo</p>
        <p className="text-lg font-semibold">{householdName}</p>
      </div>
      <nav className="space-y-2">
        {APP_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <SignOutButton className="w-full" />
      </div>
    </aside>
  );
}

