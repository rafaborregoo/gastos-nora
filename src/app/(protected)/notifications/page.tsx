import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationList } from "@/features/notifications/notification-list";
import { getAppContext, getNotifications } from "@/lib/queries/household-queries";

export default async function NotificationsPage() {
  const [{ user }, notifications] = await Promise.all([getAppContext(), getNotifications()]);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notificaciones" description="Altas nuevas en tiempo real y gestión rápida de avisos." />
      {notifications.length ? (
        <NotificationList initialNotifications={notifications} userId={user.id} />
      ) : (
        <EmptyState title="Sin notificaciones" description="Las nuevas altas de gastos compartidos y liquidaciones aparecerán aquí." />
      )}
    </div>
  );
}

