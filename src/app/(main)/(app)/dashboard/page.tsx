import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BriefList } from "@/components/app/brief-list";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { briefCountsByStatus, listBriefs } from "@/server/dal/briefs";
import { briefStatus, type BriefStatus } from "@/server/db/schema";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("title") };
}

function parseStatus(value: unknown): BriefStatus | undefined {
  return briefStatus.enumValues.find((s) => s === value);
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const status = parseStatus((await searchParams).status);
  const [t, tStatus, tNav, counts, briefs] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("status"),
    getTranslations("nav"),
    briefCountsByStatus(user.id),
    listBriefs(user.id, { status }),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const filters: { key: BriefStatus | undefined; label: string; count: number }[] = [
    { key: undefined, label: t("filterAll"), count: total },
    ...briefStatus.enumValues.map((s) => ({ key: s, label: tStatus(s), count: counts[s] })),
  ];

  return (
    <>
      <PageHeader
        title={t("greeting", { name: user.name.split(" ")[0] })}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/briefs/new">
              <Plus /> {tNav("newBrief")}
            </Link>
          </Button>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("emptyTitle")}
          text={t("emptyText")}
          action={
            <Button asChild>
              <Link href="/briefs/new">
                <Plus /> {tNav("newBrief")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <nav className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label={t("columnStatus")}>
            {filters.map((f) => {
              const active = f.key === status;
              return (
                <Link
                  key={f.key ?? "all"}
                  href={f.key ? `/dashboard?status=${f.key}` : "/dashboard"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-xl border p-4 transition-colors hover:border-primary/50",
                    active && "border-primary bg-primary/5",
                  )}
                >
                  <div className="text-2xl font-semibold tabular-nums">{f.count}</div>
                  <div className="truncate text-sm text-muted-foreground">{f.label}</div>
                </Link>
              );
            })}
          </nav>
          {briefs.length > 0 ? (
            <BriefList briefs={briefs} />
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t("emptyTitle")}
            </p>
          )}
        </>
      )}
    </>
  );
}
