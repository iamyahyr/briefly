import { ArrowLeft, Mail, Pencil, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BriefList } from "@/components/app/brief-list";
import { ClientFormDialog } from "@/components/app/client-form-dialog";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { listBriefs } from "@/server/dal/briefs";
import { getClient } from "@/server/dal/clients";
import { DomainError } from "@/server/dal/errors";
import { requireUser } from "@/server/session";
import { DeleteClientButton } from "./delete-client-button";

async function load(userId: string, id: string) {
  try {
    return await getClient(userId, id);
  } catch (error) {
    if (error instanceof DomainError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const client = await load(user.id, (await params).id);
  return { title: client.name };
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = await load(user.id, id);
  const [t, tNav, briefs] = await Promise.all([
    getTranslations("clients"),
    getTranslations("nav"),
    listBriefs(user.id, { clientId: id }),
  ]);

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("title")}
      </Link>
      <PageHeader
        title={client.name}
        actions={
          <>
            <ClientFormDialog
              client={{
                id: client.id,
                name: client.name,
                email: client.email ?? "",
                phone: client.phone ?? "",
                notes: client.notes ?? "",
              }}
              trigger={
                <Button variant="outline">
                  <Pencil /> {t("edit")}
                </Button>
              }
            />
            <DeleteClientButton id={client.id} />
          </>
        }
      >
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="size-4" /> {client.email}
            </a>
          )}
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="size-4" /> {client.phone}
            </a>
          )}
        </div>
      </PageHeader>

      {client.notes && (
        <section className="mb-8 rounded-xl border bg-muted/40 p-4">
          <h2 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("notes")}
          </h2>
          <p className="text-sm whitespace-pre-line">{client.notes}</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("briefs")}</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/briefs/new?client=${client.id}`}>
              <Plus /> {tNav("newBrief")}
            </Link>
          </Button>
        </div>
        {briefs.length ? (
          <BriefList briefs={briefs} showClient={false} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("noBriefs")}
          </p>
        )}
      </section>
    </>
  );
}
