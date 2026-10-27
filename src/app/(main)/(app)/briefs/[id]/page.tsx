import { ArrowLeft, CalendarClock, FileText, Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AnswerView, getFormatLabels } from "@/components/app/answer-view";
import { StatusBadge } from "@/components/app/status-badge";
import { Progress } from "@/components/ui/progress";
import { answerToText } from "@/lib/answer-format";
import { formatBytes } from "@/lib/format";
import { getBriefDetail } from "@/server/dal/briefs";
import { DomainError } from "@/server/dal/errors";
import { markBriefNotificationsRead } from "@/server/dal/notifications";
import { env } from "@/server/env";
import { requireUser } from "@/server/session";
import { isAnswerField } from "@/templates/types";
import { BriefActions } from "./brief-actions";
import { CopyButton } from "./copy-button";
import { ShareCard } from "./share-card";

async function load(userId: string, id: string) {
  try {
    return await getBriefDetail(userId, id);
  } catch (error) {
    if (error instanceof DomainError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/briefs/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const { brief } = await load(user.id, (await params).id);
  return { title: brief.title };
}

export default async function BriefPage({ params }: PageProps<"/briefs/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await load(user.id, id);
  const { brief, client, answers, uploads, access } = detail;
  await markBriefNotificationsRead(user.id, id);

  // Labels follow the viewer's UI language; the questionnaire may be in another one.
  const [t, tNav, format, labels, locale] = await Promise.all([
    getTranslations("briefs"),
    getTranslations("nav"),
    getFormatter(),
    getFormatLabels(),
    getLocale(),
  ]);
  const template = brief.templateSnapshot;

  return (
    <>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {tNav("dashboard")}
      </Link>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={brief.status} />
            <span className="text-xs text-muted-foreground">
              {template.name[locale]} · {t("templateVersion", { version: brief.templateVersion })}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{brief.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Link
              href={`/clients/${client.id}`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {client.name}
            </Link>
            {brief.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-4" />
                {format.dateTime(new Date(brief.dueDate), { dateStyle: "medium" })}
              </span>
            )}
            <span>
              {brief.submittedAt
                ? t("submittedOn", {
                    date: format.dateTime(brief.submittedAt, { dateStyle: "medium", timeStyle: "short" }),
                  })
                : t("notSubmitted")}
            </span>
          </div>
        </div>
        <BriefActions
          brief={{
            id: brief.id,
            status: brief.status,
            title: brief.title,
            locale: brief.locale,
            dueDate: brief.dueDate ?? "",
          }}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-2 space-y-6 lg:order-1">
          {brief.status === "draft" || (brief.status === "waiting" && brief.progress === 0) ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("waitingHint")}
            </p>
          ) : null}

          {template.sections.map((section, index) => (
            <section key={section.key} className="rounded-xl border bg-card">
              <header className="border-b px-5 py-4">
                <h2 className="font-semibold">
                  <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                  {section.title[locale]}
                </h2>
              </header>
              <dl className="divide-y">
                {section.fields.map((field) => {
                  if (field.type === "notice") return null;
                  if (field.type === "file") {
                    const files = uploads.filter((u) => u.fieldKey === field.key);
                    return (
                      <div key={field.key} className="grid gap-2 px-5 py-4">
                        <dt className="text-sm text-muted-foreground">{field.label[locale]}</dt>
                        <dd>
                          {files.length === 0 ? (
                            <span className="text-sm text-muted-foreground italic">{t("noAnswer")}</span>
                          ) : (
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                              {files.map((file) => (
                                <li key={file.id}>
                                  <a
                                    href={`/api/files/${file.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block overflow-hidden rounded-lg border transition-colors hover:border-primary/50"
                                  >
                                    <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-muted">
                                      {file.hasThumbnail || file.mimeType === "image/svg+xml" ? (
                                        // SVGs inside <img> never run scripts, so previewing them is safe.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={`/api/files/${file.id}${file.hasThumbnail ? "?thumb=1" : ""}`}
                                          alt={file.originalName}
                                          loading="lazy"
                                          className="size-full object-cover transition-transform group-hover:scale-105"
                                        />
                                      ) : file.mimeType === "application/pdf" ? (
                                        <FileText className="size-8 text-muted-foreground" />
                                      ) : (
                                        <ImageIcon className="size-8 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="px-2 py-1.5">
                                      <div className="truncate text-xs font-medium">{file.originalName}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {formatBytes(file.sizeBytes)}
                                      </div>
                                    </div>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </dd>
                      </div>
                    );
                  }
                  if (!isAnswerField(field)) return null;
                  const text = answerToText(field, answers[field.key], locale, labels);
                  return (
                    <div key={field.key} className="group grid gap-1.5 px-5 py-4">
                      <dt className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
                        {field.label[locale]}
                        {text && <CopyButton text={text} label={t("copyAnswer")} />}
                      </dt>
                      <dd>
                        <AnswerView field={field} value={answers[field.key]} locale={locale} />
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{t("progress")}</span>
              <span className="text-muted-foreground tabular-nums">{brief.progress}%</span>
            </div>
            <Progress value={brief.progress} />
            <p className="mt-3 text-xs text-muted-foreground">{t("files", { count: uploads.length })}</p>
          </div>
          <ShareCard
            briefId={brief.id}
            status={brief.status}
            appUrl={env().APP_URL}
            access={
              access
                ? {
                    token: access.token,
                    expired: access.expired,
                    expiresAt: access.expiresAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </aside>
      </div>
    </>
  );
}
