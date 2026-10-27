import { ChevronRight, Plus, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClientFormDialog } from "@/components/app/client-form-dialog";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listClients } from "@/server/dal/clients";
import { requireUser } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("clients"))("title") };
}

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const user = await requireUser();
  const q = (await searchParams).q;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const [t, clients] = await Promise.all([getTranslations("clients"), listClients(user.id, search)]);

  const newButton = (
    <ClientFormDialog
      trigger={
        <Button>
          <Plus /> {t("new")}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={newButton} />

      {clients.length === 0 && !search ? (
        <EmptyState icon={Users} title={t("emptyTitle")} text={t("emptyText")} action={newButton} />
      ) : (
        <div className="space-y-4">
          <form className="relative max-w-sm" role="search">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={search}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-9 pl-9"
            />
          </form>
          {clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {client.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{client.name}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {[client.email, client.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <span className="hidden text-sm text-muted-foreground sm:block">
                      {t("briefCount", { count: client.briefCount })}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
