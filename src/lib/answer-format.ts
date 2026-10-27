import { isEmptyValue, isUrlish } from "@/templates/schema-builder";
import {
  WEEK_DAYS,
  type AnswerValue,
  type FieldDefinition,
  type ListItemValue,
  type Locale,
  type Option,
  type ReferenceValue,
  type WeekDay,
  type WeeklyHoursValue,
} from "@/templates/types";

export type FormatLabels = {
  day: (day: WeekDay) => string;
  network: (network: string) => string;
  closed: string;
};

export function optionLabel(options: Option[], value: string, locale: Locale): string {
  return options.find((o) => o.value === value)?.label[locale] ?? value;
}

/** Only http(s) links, with a protocol added when the client omitted it. */
export function toHref(value: string): string | null {
  const v = value.trim();
  if (!isUrlish(v)) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function hoursLines(value: WeeklyHoursValue, labels: FormatLabels): { day: string; text: string }[] {
  return WEEK_DAYS.flatMap((day) => {
    const entry = value[day];
    if (!entry) return [];
    if (entry.closed) return [{ day: labels.day(day), text: labels.closed }];
    const ranges = entry.ranges.filter((r) => r.open && r.close);
    if (!ranges.length) return [];
    return [{ day: labels.day(day), text: ranges.map((r) => `${r.open}–${r.close}`).join(", ") }];
  });
}

/** Plain-text rendering of an answer, used for exports and "copy answer". */
export function answerToText(
  field: FieldDefinition,
  value: AnswerValue | undefined,
  locale: Locale,
  labels: FormatLabels,
): string {
  if (isEmptyValue(value) || field.type === "notice" || field.type === "file") return "";

  switch (field.type) {
    case "select":
      return optionLabel(field.options, value as string, locale);
    case "multiselect":
      return (value as string[]).map((v) => optionLabel(field.options, v, locale)).join(", ");
    case "weekly-hours":
      return hoursLines(value as WeeklyHoursValue, labels)
        .map((l) => `${l.day}: ${l.text}`)
        .join("\n");
    case "social-links":
      return Object.entries(value as Record<string, string>)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${labels.network(k)}: ${v.trim()}`)
        .join("\n");
    case "colors":
      return (value as string[]).join(", ");
    case "references":
      return (value as ReferenceValue[])
        .filter((r) => !isEmptyValue(r))
        .map((r, i) => `${i + 1}. ${[r.url.trim(), r.note.trim()].filter(Boolean).join(" — ")}`)
        .join("\n");
    case "list":
      return (value as ListItemValue[])
        .filter((item) => !isEmptyValue(item))
        .map((item) => `- ${[item.title.trim(), item.description.trim()].filter(Boolean).join(": ")}`)
        .join("\n");
    default:
      return String(value).trim();
  }
}
