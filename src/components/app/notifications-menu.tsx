"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { markNotificationsReadAction } from "@/server/actions/briefs";

type Item = {
  id: string;
  briefId: string;
  briefTitle: string;
  clientName: string;
  createdAt: string;
  read: boolean;
};

export function NotificationsMenu({ unread, items }: { unread: number; items: Item[] }) {
  const t = useTranslations("nav");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${t("notifications")}${unread ? ` (${unread})` : ""}`}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">{t("notifications")}</span>
          {unread > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={pending}
              onClick={() => startTransition(async () => void (await markNotificationsReadAction()))}
            >
              {t("markAllRead")}
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("noNotifications")}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/briefs/${item.briefId}`}
                  className={cn("flex gap-3 px-4 py-3 text-sm hover:bg-muted", !item.read && "bg-primary/5")}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      item.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block">
                      {t("briefSubmitted", { client: item.clientName, title: item.briefTitle })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format.relativeTime(new Date(item.createdAt))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
