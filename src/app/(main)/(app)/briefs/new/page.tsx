import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/app/page-header";
import { listClients } from "@/server/dal/clients";
import { requireUser } from "@/server/session";
import { allFields } from "@/templates/schema-builder";
import { templates } from "@/templates/registry";
import { NewBriefForm } from "./new-brief-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("briefs"))("newTitle") };
}

export default async function NewBriefPage({ searchParams }: PageProps<"/briefs/new">) {
  const user = await requireUser();
  const [t, locale, clients, params] = await Promise.all([
    getTranslations("briefs"),
    getLocale(),
    listClients(user.id),
    searchParams,
  ]);
  const preselected = typeof params.client === "string" ? params.client : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("newTitle")} description={t("newSubtitle")} />
      <NewBriefForm
        defaultLocale={locale}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        defaultClientId={clients.some((c) => c.id === preselected) ? preselected : undefined}
        templates={templates.map((tpl) => ({
          key: tpl.key,
          name: tpl.name[locale],
          description: tpl.description[locale],
          sections: tpl.sections.length,
          fields: allFields(tpl).filter((f) => f.type !== "notice").length,
        }))}
      />
    </div>
  );
}
