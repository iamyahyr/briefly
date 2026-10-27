import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/app/status-badge";
import { Progress } from "@/components/ui/progress";
import type { BriefStatus } from "@/server/db/schema";

export type BriefRow = {
  id: string;
  title: string;
  status: BriefStatus;
  progress: number;
  dueDate: string | null;
  updatedAt: Date;
  clientName: string;
};

export async function BriefList({ briefs, showClient = true }: { briefs: BriefRow[]; showClient?: boolean }) {
  const [t, format] = await Promise.all([getTranslations("dashboard"), getFormatter()]);

  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {briefs.map((brief) => (
        <li key={brief.id}>
          <Link
            href={`/briefs/${brief.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,2fr)_10rem_9rem_auto]"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{brief.title}</div>
              <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                {showClient && <span className="truncate">{brief.clientName}</span>}
                {brief.dueDate && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    {t("due", { date: format.dateTime(new Date(brief.dueDate), { dateStyle: "medium" }) })}
                  </span>
                )}
              </div>
            </div>
            <div className="order-last col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1">
              <Progress value={brief.progress} className="h-1.5" aria-label={t("columnProgress")} />
              <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                {brief.progress}%
              </span>
            </div>
            <div className="justify-self-end sm:justify-self-start">
              <StatusBadge status={brief.status} />
            </div>
            <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
