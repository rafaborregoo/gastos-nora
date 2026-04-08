import { redirect } from "next/navigation";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Sidebar } from "@/components/layout/sidebar";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getAppContext, getUnreadNotificationsCount } from "@/lib/queries/household-queries";

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, householdBundle } = await getAppContext();

  if (!user) {
    redirect("/login");
  }

  if (!householdBundle) {
    redirect("/onboarding");
  }

  const unreadNotifications = await getUnreadNotificationsCount();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 md:p-6">
      <Sidebar householdName={householdBundle.household.name} />
      <div className="flex min-h-full flex-1 flex-col rounded-[32px] border border-border bg-card/60 p-4 shadow-soft backdrop-blur md:p-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block" />
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell unreadNotifications={unreadNotifications} />
            <div className="md:hidden">
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 pb-32 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
