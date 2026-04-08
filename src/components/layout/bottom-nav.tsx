"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

import { APP_NAV_ITEMS } from "@/components/layout/nav-links";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const mobileItems = APP_NAV_ITEMS.slice(0, 5);
  const navStyle = {
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)"
  } satisfies CSSProperties;

  return (
    <nav
      style={navStyle}
      className="fixed inset-x-0 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-md items-center justify-between rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-soft backdrop-blur md:hidden"
    >
      {mobileItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-1 touch-manipulation flex-col items-center gap-1 rounded-full px-2 py-2 text-[11px] font-medium active:scale-[0.98]",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
