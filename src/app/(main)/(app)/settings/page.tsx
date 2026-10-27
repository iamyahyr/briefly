import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PageHeader } from "@/components/app/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { getWorkspace } from "@/server/dal/workspace";
import { requireUser } from "@/server/session";
import { BrandingForm } from "./branding-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("settings"))("title") };
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_1fr] md:gap-10">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [t, tAuth, tCommon, workspace] = await Promise.all([
    getTranslations("settings"),
    getTranslations("auth"),
    getTranslations("common"),
    getWorkspace(user.id),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <Section title={t("profile")} text={t("profileText")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted-foreground">{tAuth("name")}</dt>
          <dd>{user.name}</dd>
          <dt className="text-muted-foreground">{tAuth("email")}</dt>
          <dd>{user.email}</dd>
        </dl>
      </Section>
      <Section title={t("branding")} text={t("brandingText")}>
        <BrandingForm
          defaultName={user.name}
          displayName={workspace.displayName}
          accentColor={workspace.accentColor}
          logoUrl={workspace.logoUploadId ? `/api/files/${workspace.logoUploadId}` : null}
        />
      </Section>
      <Section title={t("preferences")} text={t("preferencesText")}>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="inline-flex items-center gap-2">
            {tCommon("language")} <LocaleSwitcher />
          </span>
          <span className="inline-flex items-center gap-2">
            {tCommon("theme")} <ThemeToggle />
          </span>
        </div>
      </Section>
    </>
  );
}
