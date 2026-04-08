"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { markNotificationAsReadAction } from "@/lib/actions/notification-actions";
import { formatDisplayDate } from "@/lib/formatters/date";
import type { Notification } from "@/types/database";

export function NotificationList({
  initialNotifications,
  userId
}: {
  initialNotifications: Notification[];
  userId: string;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setItems((current) => [payload.new as Notification, ...current]);
          toast.info("Nueva notificación recibida.");
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="space-y-4">
      {items.map((notification) => (
        <Card key={notification.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${notification.is_read ? "bg-muted" : "bg-primary/10 text-primary"}`}>
              <BellRing className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{notification.title}</h3>
                {!notification.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </div>
              <p className="text-sm text-muted-foreground">{notification.body ?? "Sin detalle adicional."}</p>
              <p className="text-xs text-muted-foreground">{formatDisplayDate(notification.created_at, "d MMM yyyy, HH:mm")}</p>
            </div>
          </div>
          {!notification.is_read ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await markNotificationAsReadAction(notification.id);

                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }

                  setItems((current) =>
                    current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
                  );
                });
              }}
            >
              Marcar leída
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
