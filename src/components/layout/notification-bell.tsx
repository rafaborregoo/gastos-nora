"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";

export function NotificationBell({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname();
  const isActive = pathname === "/notifications";

  return (
    <Link
      href="/notifications"
      aria-label="Abrir notificaciones"
      className={cn(
        "relative inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-border bg-card text-foreground shadow-soft transition hover:bg-muted active:scale-[0.98]",
        isActive ? "border-primary text-primary" : ""
      )}
    >
      <Bell className="h-5 w-5" />
      {unreadNotifications > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-danger-foreground">
          {unreadNotifications > 99 ? "99+" : unreadNotifications}
        </span>
      ) : null}
    </Link>
  );
}
