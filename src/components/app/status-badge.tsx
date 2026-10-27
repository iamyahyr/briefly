import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BriefStatus } from "@/server/db/schema";
import { cn } from "@/lib/utils";

const styles: Record<BriefStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  waiting: "bg-warning/15 text-amber-700 dark:text-amber-300",
  received: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-emerald-700 dark:text-emerald-300",
};

export function StatusBadge({ status, className }: { status: BriefStatus; className?: string }) {
  const t = useTranslations("status");
  return (
    <Badge variant="secondary" className={cn("border-transparent font-medium", styles[status], className)}>
      {t(status)}
    </Badge>
  );
}
