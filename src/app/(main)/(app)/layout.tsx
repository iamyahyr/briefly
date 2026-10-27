import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MainNav, MobileNav } from "@/components/app/main-nav";
import { NotificationsMenu } from "@/components/app/notifications-menu";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { listNotifications, unreadCount } from "@/server/dal/notifications";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [t, notifications, unread] = await Promise.all([
    getTranslations("nav"),
    listNotifications(user.id),
    unreadCount(user.id),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <MobileNav />
          <Link href="/dashboard" aria-label="Briefly" className="mr-4">
            <Logo />
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-1">
            <Button asChild size="sm" className="hidden h-8 sm:inline-flex">
              <Link href="/briefs/new">
                <Plus /> {t("newBrief")}
              </Link>
            </Button>
            <NotificationsMenu
              unread={unread}
              items={notifications.map((n) => ({
                ...n,
                createdAt: n.createdAt.toISOString(),
                read: !!n.readAt,
              }))}
            />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
