import { FileCheck2, Link2, Lock, Server, Smartphone, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GITHUB_URL } from "@/lib/config";
import { getSessionUser } from "@/server/session";
import { localBusiness } from "@/templates/local-business";

export default async function LandingPage() {
  const [t, user] = await Promise.all([getTranslations("landing"), getSessionUser()]);
  const tNav = await getTranslations("nav");

  const steps = [
    { icon: Sparkles, title: t("step1Title"), text: t("step1Text") },
    { icon: Link2, title: t("step2Title"), text: t("step2Text") },
    { icon: FileCheck2, title: t("step3Title"), text: t("step3Text") },
  ];
  const features = [
    { icon: Smartphone, title: t("feature1Title"), text: t("feature1Text") },
    { icon: Upload, title: t("feature2Title"), text: t("feature2Text") },
    { icon: Lock, title: t("feature3Title"), text: t("feature3Text") },
    { icon: Server, title: t("feature4Title"), text: t("feature4Text") },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <Button asChild>
              <Link href="/dashboard">{tNav("dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="space-y-6">
            <Badge variant="secondary">{t("badge")}</Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href={user ? "/dashboard" : "/signup"}>{t("ctaPrimary")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  {t("ctaSecondary")}
                </a>
              </Button>
            </div>
          </div>
          <QuestionnairePreview />
        </section>

        <section className="border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-10 text-2xl font-semibold tracking-tight">{t("howTitle")}</h2>
            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-xl border bg-background p-6">
                  <div className="mb-4 flex items-center gap-3 text-primary">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <step.icon className="size-5" />
                  </div>
                  <h3 className="mb-1 font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight">{t("featuresTitle")}</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h3 className="mb-1 font-medium">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("footer")}</p>
          <a href={GITHUB_URL} className="underline-offset-4 hover:text-foreground hover:underline">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

/** Static illustration of the client questionnaire. */
async function QuestionnairePreview() {
  const [t, locale] = await Promise.all([getTranslations("questionnaire"), getLocale()]);
  const section = localBusiness.sections[2];
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/15 blur-2xl" />
      <div className="space-y-5 rounded-3xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t("stepOf", { current: 3, total: 5 })}</span>
          <span className="text-muted-foreground">60%</span>
        </div>
        <Progress value={60} />
        <div className="space-y-1">
          <div className="text-lg font-semibold">{section.title[locale]}</div>
          <div className="text-sm text-muted-foreground">{section.description?.[locale]}</div>
        </div>
        <div className="grid place-items-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
          <Upload className="mb-2 size-6 text-primary" />
          <div className="text-sm font-medium">logo-cafeteria-nube.svg</div>
          <div className="text-xs text-muted-foreground">24 KB</div>
        </div>
        <div className="flex gap-2">
          {["#1F2937", "#F59E0B", "#FDF6EC", "#7C3AED"].map((c) => (
            <span key={c} className="size-9 rounded-full border" style={{ background: c }} />
          ))}
        </div>
        <div className="flex justify-between">
          <span className="rounded-lg border px-4 py-2 text-sm">{t("previous")}</span>
          <span className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{t("next")}</span>
        </div>
      </div>
    </div>
  );
}
