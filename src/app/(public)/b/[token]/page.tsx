import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/logo";
import { Questionnaire } from "@/components/questionnaire/questionnaire";
import { getAnswers } from "@/server/dal/questionnaire";
import { listBriefUploads } from "@/server/dal/uploads";
import { env } from "@/server/env";
import { getPublicBrief } from "./brief";

/** Readable text colour on top of the freelancer's accent colour. */
function foregroundFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

export default async function PublicBriefPage({ params }: PageProps<"/b/[token]">) {
  const { token } = await params;
  const brief = await getPublicBrief(token);
  if (!brief) notFound();

  const locale = brief.locale;
  const t = await getTranslations({ locale, namespace: "questionnaire" });
  const ownerName = brief.brandName || brief.ownerName;
  const logoUrl = brief.brandLogoId ? `/api/public/${token}/files/${brief.brandLogoId}` : null;
  const brandStyle = brief.brandColor
    ? ({
        "--primary": brief.brandColor,
        "--ring": brief.brandColor,
        "--primary-foreground": foregroundFor(brief.brandColor),
      } as React.CSSProperties)
    : undefined;

  let content: React.ReactNode;
  if (brief.status !== "waiting") {
    content = (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="mb-6 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">{t("lockedTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{t("lockedText", { owner: ownerName })}</p>
      </div>
    );
  } else {
    const [answers, files] = await Promise.all([getAnswers(brief.id), listBriefUploads(brief.id)]);
    content = (
      <Questionnaire
        token={token}
        locale={locale}
        template={brief.template}
        answers={answers}
        files={files}
        initialStep={brief.currentStep}
        ownerName={ownerName}
        clientName={brief.clientName}
        logoUrl={logoUrl}
        dueDate={brief.dueDate}
        maxFileMb={env().UPLOAD_MAX_FILE_MB}
      />
    );
  }

  return (
    <div style={brandStyle} className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 sm:px-6">{content}</main>
      <footer className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground">
        <LogoMark className="size-4" />
        {t("poweredBy")}
      </footer>
    </div>
  );
}
