import { ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { hoursLines, optionLabel, toHref, type FormatLabels } from "@/lib/answer-format";
import { isEmptyValue } from "@/templates/schema-builder";
import type {
  AnswerField,
  AnswerValue,
  ListItemValue,
  Locale,
  ReferenceValue,
  WeekDay,
  WeeklyHoursValue,
} from "@/templates/types";

export async function getFormatLabels(locale?: Locale): Promise<FormatLabels> {
  const t = locale ? await getTranslations({ locale, namespace: "fields" }) : await getTranslations("fields");
  return {
    day: (day: WeekDay) => t(`days.${day}`),
    network: (n: string) => (t.has(`networks.${n}` as "networks.x") ? t(`networks.${n}` as "networks.x") : n),
    closed: t("closed"),
  };
}

function MaybeLink({ value }: { value: string }) {
  const href = toHref(value);
  if (!href) return <>{value}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener nofollow"
      className="inline-flex items-center gap-1 break-all text-primary underline-offset-4 hover:underline"
    >
      {value}
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

/** Rich, read-only rendering of one answer on the review screen. */
export async function AnswerView({
  field,
  value,
  locale,
}: {
  field: AnswerField;
  value: AnswerValue | undefined;
  locale: Locale;
}) {
  const t = await getTranslations("briefs");
  if (isEmptyValue(value))
    return <span className="text-sm text-muted-foreground italic">{t("noAnswer")}</span>;

  switch (field.type) {
    case "text":
    case "textarea":
    case "phone":
      return <p className="text-sm break-words whitespace-pre-line">{value as string}</p>;
    case "email":
      return (
        <a href={`mailto:${value}`} className="text-sm text-primary underline-offset-4 hover:underline">
          {value as string}
        </a>
      );
    case "url":
      return (
        <span className="text-sm">
          <MaybeLink value={value as string} />
        </span>
      );
    case "date": {
      const format = await getFormatter();
      return <p className="text-sm">{format.dateTime(new Date(value as string), { dateStyle: "long" })}</p>;
    }
    case "select":
      return <p className="text-sm">{optionLabel(field.options, value as string, locale)}</p>;
    case "multiselect":
      return (
        <ul className="flex flex-wrap gap-1.5">
          {(value as string[]).map((v) => (
            <li key={v} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
              {optionLabel(field.options, v, locale)}
            </li>
          ))}
        </ul>
      );
    case "weekly-hours": {
      const lines = hoursLines(value as WeeklyHoursValue, await getFormatLabels());
      return (
        <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          {lines.map((line) => (
            <div key={line.day} className="contents">
              <dt className="text-muted-foreground">{line.day}</dt>
              <dd className="tabular-nums">{line.text}</dd>
            </div>
          ))}
        </dl>
      );
    }
    case "social-links": {
      const labels = await getFormatLabels();
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          {Object.entries(value as Record<string, string>)
            .filter(([, v]) => v.trim())
            .map(([network, v]) => (
              <div key={network} className="contents">
                <dt className="text-muted-foreground">{labels.network(network)}</dt>
                <dd className="min-w-0">
                  <MaybeLink value={v.trim()} />
                </dd>
              </div>
            ))}
        </dl>
      );
    }
    case "colors":
      return (
        <ul className="flex flex-wrap gap-3">
          {(value as string[]).map((color) => (
            <li key={color} className="flex items-center gap-2 text-sm">
              <span className="size-8 rounded-lg border shadow-xs" style={{ background: color }} />
              <code className="text-xs">{color.toUpperCase()}</code>
            </li>
          ))}
        </ul>
      );
    case "references":
      return (
        <ol className="grid gap-3">
          {(value as ReferenceValue[])
            .filter((r) => !isEmptyValue(r))
            .map((ref, i) => (
              <li key={i} className="rounded-lg border bg-muted/40 p-3 text-sm">
                {ref.url.trim() && <MaybeLink value={ref.url.trim()} />}
                {ref.note.trim() && (
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{ref.note}</p>
                )}
              </li>
            ))}
        </ol>
      );
    case "list":
      return (
        <ul className="grid gap-2">
          {(value as ListItemValue[])
            .filter((item) => !isEmptyValue(item))
            .map((item, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{item.title}</span>
                {item.description.trim() && (
                  <p className="whitespace-pre-line text-muted-foreground">{item.description}</p>
                )}
              </li>
            ))}
        </ul>
      );
  }
}
