"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Loader2,
  Pencil,
  Send,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { answerToText, type FormatLabels } from "@/lib/answer-format";
import { cn } from "@/lib/utils";
import { saveDraftAction, submitBriefAction } from "@/server/actions/questionnaire";
import { isEmptyValue, sectionSchema } from "@/templates/schema-builder";
import {
  isAnswerField,
  type AnswerMap,
  type AnswerValue,
  type Locale,
  type SectionDefinition,
  type TemplateDefinition,
  type WeekDay,
} from "@/templates/types";
import { initialValues } from "./defaults";
import { AnswerFieldRenderer, FieldShell, Notice } from "./field-renderer";
import { FileInput, type UploadedFile } from "./fields/file-input";

type Props = {
  token: string;
  locale: Locale;
  template: TemplateDefinition;
  answers: AnswerMap;
  files: UploadedFile[];
  initialStep: number;
  ownerName: string;
  clientName: string;
  logoUrl: string | null;
  dueDate: string | null;
  maxFileMb: number;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const WELCOME = -1;

export function Questionnaire(props: Props) {
  const { token, locale, template, ownerName, clientName, maxFileMb } = props;
  const t = useTranslations("questionnaire");
  const tErrors = useTranslations("errors");
  const tFields = useTranslations("fields");
  const format = useFormatter();
  const sections = template.sections;
  const reviewStep = sections.length;

  const [step, setStep] = useState(WELCOME);
  const [values, setValues] = useState(() => initialValues(template, props.answers));
  const [files, setFiles] = useState(props.files);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [state, setState] = useState<"editing" | "submitting" | "submitted" | "locked">("editing");

  // Refs hold the latest data for the debounced autosave.
  const valuesRef = useRef(values);
  const stepRef = useRef(step);
  const dirty = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const retryRef = useRef<() => void>(() => {});

  const errorText = useCallback(
    (code: string) => tErrors(code as "generic", { max: maxFileMb }),
    [tErrors, maxFileMb],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const keys = [...dirty.current];
    dirty.current.clear();
    const payload = Object.fromEntries(keys.map((k) => [k, valuesRef.current[k]]));
    setSaveStatus("saving");

    const request = saveDraftAction(token, payload, Math.max(stepRef.current, 0))
      .then((result) => {
        if (result.ok) {
          setSaveStatus("saved");
          return true;
        }
        if (result.error === "locked" || result.error === "not_found") {
          setState("locked");
          return false;
        }
        throw new Error(result.error);
      })
      .catch(() => {
        keys.forEach((k) => dirty.current.add(k));
        setSaveStatus("error");
        timer.current = setTimeout(() => retryRef.current(), 4000);
        return false;
      });
    inflight.current = request;
    const ok = await request;
    inflight.current = null;
    return ok;
  }, [token]);

  useEffect(() => {
    retryRef.current = () => void flush();
  }, [flush]);

  // Save when the tab is hidden (mobile users often just switch apps).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirty.current.size) void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  function setValue(key: string, value: AnswerValue) {
    valuesRef.current = { ...valuesRef.current, [key]: value };
    setValues(valuesRef.current);
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _removed, ...rest } = e;
      return rest;
    });
    dirty.current.add(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 800);
  }

  function goTo(next: number) {
    stepRef.current = next;
    setStep(next);
    if (next >= 0) void flush();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateSection(section: SectionDefinition): Record<string, string> {
    const sectionValues = Object.fromEntries(
      section.fields.filter(isAnswerField).map((f) => [f.key, valuesRef.current[f.key]]),
    );
    const found: Record<string, string> = {};
    const result = sectionSchema(section, "submit").safeParse(sectionValues);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        found[key] ??= issue.message;
      }
    }
    for (const field of section.fields) {
      if (field.type === "file" && field.required && !files.some((f) => f.fieldKey === field.key)) {
        found[field.key] = "required";
      }
    }
    return found;
  }

  function focusFirstError(keys: string[]) {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${keys[0]}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("input, textarea, button, [role=combobox]")?.focus({
        preventScroll: true,
      });
    });
  }

  function next() {
    const found = validateSection(sections[step]);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(Object.keys(found));
    goTo(step + 1);
  }

  async function submit() {
    setState("submitting");
    await flush();
    const result = await submitBriefAction(token);
    if (!result.ok) {
      if (result.error === "locked") return setState("locked");
      setState("editing");
      return void toast.error(errorText(result.error));
    }
    if (!result.data.ok) {
      setState("editing");
      setErrors(result.data.errors);
      toast.error(t("fixErrors"));
      goTo(result.data.firstInvalidSection ?? 0);
      return focusFirstError(Object.keys(result.data.errors));
    }
    setState("submitted");
    topRef.current?.scrollIntoView({ block: "start" });
  }

  const labels: FormatLabels = {
    day: (d: WeekDay) => tFields(`days.${d}`),
    network: (n) =>
      tFields.has(`networks.${n}` as "networks.x") ? tFields(`networks.${n}` as "networks.x") : n,
    closed: tFields("closed"),
  };

  const header = (
    <header className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {props.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.logoUrl} alt="" className="size-9 rounded-lg object-contain" />
        )}
        <span className="truncate text-sm font-medium">{t("preparedBy", { name: ownerName })}</span>
      </div>
      {state === "editing" && step >= 0 && <SaveIndicator status={saveStatus} />}
    </header>
  );

  if (state === "submitted" || state === "locked") {
    return (
      <div ref={topRef}>
        {header}
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-6 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold">
            {state === "submitted" ? t("thanksTitle") : t("lockedTitle")}
          </h1>
          <p className="max-w-md text-muted-foreground">
            {state === "submitted"
              ? t("thanksText", { owner: ownerName })
              : t("lockedText", { owner: ownerName })}
          </p>
        </div>
      </div>
    );
  }

  if (step === WELCOME) {
    const started = props.initialStep > 0 || Object.keys(props.answers).length > 0 || props.files.length > 0;
    return (
      <div ref={topRef}>
        {header}
        <div className="py-8 sm:py-12">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-balance">
            {t("welcomeTitle", { client: clientName })}
          </h1>
          <p className="mb-6 text-lg text-pretty text-muted-foreground">
            {t("welcomeText", { owner: ownerName })}
          </p>
          {props.dueDate && (
            <p className="mb-6 inline-block rounded-lg bg-muted px-3 py-2 text-sm">
              {t("dueBy", { date: format.dateTime(new Date(props.dueDate), { dateStyle: "long" }) })}
            </p>
          )}
          <ol className="mb-8 grid gap-2">
            {sections.map((section, i) => (
              <li key={section.key} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="font-medium">{section.title[locale]}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-2 sm:flex-row">
            {started && (
              <Button
                size="lg"
                className="h-12 px-6 text-base"
                onClick={() => goTo(Math.min(props.initialStep, reviewStep))}
              >
                {t("continue")} <ArrowRight />
              </Button>
            )}
            <Button
              size="lg"
              variant={started ? "outline" : "default"}
              className="h-12 px-6 text-base"
              onClick={() => goTo(0)}
            >
              {t("start")} {!started && <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const percent = Math.round(((step + 1) / (sections.length + 1)) * 100);
  const nav = (
    <div className="sticky bottom-0 -mx-4 mt-10 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      <Button variant="outline" size="lg" className="h-11" onClick={() => goTo(step - 1)}>
        <ArrowLeft /> {t("previous")}
      </Button>
      {step < reviewStep ? (
        <Button size="lg" className="h-11 flex-1 sm:ml-auto sm:flex-none" onClick={next}>
          {step === reviewStep - 1 ? t("review") : t("next")} <ArrowRight />
        </Button>
      ) : (
        <Button
          size="lg"
          className="h-11 flex-1 sm:ml-auto sm:flex-none"
          onClick={submit}
          disabled={state === "submitting"}
        >
          {state === "submitting" ? <Loader2 className="animate-spin" /> : <Send />}
          {state === "submitting" ? t("submitting") : t("submit")}
        </Button>
      )}
    </div>
  );

  return (
    <div ref={topRef} className="scroll-mt-4">
      {header}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {step < reviewStep ? t("stepOf", { current: step + 1, total: sections.length }) : t("review")}
          </span>
          <span className="text-muted-foreground tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} aria-label={t("stepOf", { current: step + 1, total: sections.length })} />
      </div>

      {step < reviewStep ? (
        <section aria-labelledby="section-title">
          <h1 id="section-title" className="text-2xl font-semibold tracking-tight">
            {sections[step].title[locale]}
          </h1>
          {sections[step].description && (
            <p className="mt-1 text-muted-foreground">{sections[step].description![locale]}</p>
          )}
          <div className="mt-8 grid gap-8">
            {sections[step].fields.map((field) => {
              if (field.type === "notice")
                return <Notice key={field.key} tone={field.tone} text={field.text[locale]} />;
              if (field.type === "file") {
                return (
                  <FieldShell
                    key={field.key}
                    field={field}
                    locale={locale}
                    error={errors[field.key] ? errorText(errors[field.key]) : undefined}
                  >
                    {({ id }) => (
                      <FileInput
                        id={id}
                        token={token}
                        field={field}
                        maxFileMb={maxFileMb}
                        files={files.filter((f) => f.fieldKey === field.key)}
                        onUploaded={(file) => {
                          setFiles((f) => [...f, file]);
                          setErrors(({ [field.key]: _removed, ...rest }) => rest);
                          setSaveStatus("saved");
                        }}
                        onRemoved={(id) => setFiles((f) => f.filter((file) => file.id !== id))}
                        onError={(code) => {
                          if (code === "locked") setState("locked");
                          else toast.error(errorText(code));
                        }}
                      />
                    )}
                  </FieldShell>
                );
              }
              return (
                <AnswerFieldRenderer
                  key={field.key}
                  field={field}
                  locale={locale}
                  value={values[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                  error={errors[field.key] ? errorText(errors[field.key]) : undefined}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section aria-labelledby="review-title">
          <h1 id="review-title" className="text-2xl font-semibold tracking-tight">
            {t("reviewTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("reviewText")}</p>
          <div className="mt-8 grid gap-4">
            {sections.map((section, index) => {
              const missing = section.fields.some((f) => errors[f.key]);
              return (
                <div key={section.key} className={cn("rounded-xl border", missing && "border-destructive")}>
                  <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <h2 className="font-medium">
                      {index + 1}. {section.title[locale]}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => goTo(index)}>
                      <Pencil /> {t("editSection")}
                    </Button>
                  </div>
                  <dl className="grid gap-3 px-4 py-3 text-sm">
                    {section.fields.map((field) => {
                      if (field.type === "notice") return null;
                      const text =
                        field.type === "file"
                          ? files
                              .filter((f) => f.fieldKey === field.key)
                              .map((f) => f.originalName)
                              .join(", ")
                          : answerToText(field, values[field.key], locale, labels);
                      const empty = field.type === "file" ? !text : isEmptyValue(values[field.key]);
                      return (
                        <div key={field.key} className="grid gap-0.5">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            {field.label[locale]}
                            {field.required && empty && <span className="text-destructive">*</span>}
                          </dt>
                          <dd
                            className={cn(
                              "line-clamp-3 whitespace-pre-line",
                              empty && "text-muted-foreground",
                            )}
                          >
                            {empty ? "—" : text}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{t("submitConfirm", { owner: ownerName })}</p>
        </section>
      )}

      {nav}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const t = useTranslations("questionnaire");
  if (status === "idle") return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground",
        status === "error" && "text-destructive",
      )}
    >
      {status === "saving" && <Loader2 className="size-3.5 animate-spin" />}
      {status === "saved" && <Check className="size-3.5" />}
      {status === "error" && <CloudOff className="size-3.5" />}
      {status === "saving" ? t("saving") : status === "saved" ? t("saved") : t("saveError")}
      {status === "saved" && <Cloud className="sr-only" />}
    </span>
  );
}
