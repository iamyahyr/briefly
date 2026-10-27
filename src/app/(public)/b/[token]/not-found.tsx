import { LinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";

export default async function InvalidLink() {
  const t = await getTranslations("questionnaire");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <LinkIcon className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="max-w-sm text-muted-foreground">{t("notFoundText")}</p>
      </div>
      <Logo className="mt-8 opacity-60" />
    </main>
  );
}
