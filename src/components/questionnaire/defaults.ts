import {
  WEEK_DAYS,
  isAnswerField,
  type AnswerField,
  type AnswerMap,
  type AnswerValue,
  type TemplateDefinition,
  type WeeklyHoursValue,
} from "@/templates/types";

export function emptyHours(): WeeklyHoursValue {
  return Object.fromEntries(
    WEEK_DAYS.map((d) => [d, { closed: false, ranges: [] }]),
  ) as unknown as WeeklyHoursValue;
}

/** Initial form value for a field when the client hasn't answered it yet. */
export function emptyValue(field: AnswerField): AnswerValue {
  switch (field.type) {
    case "multiselect":
    case "colors":
      return [];
    case "weekly-hours":
      return emptyHours();
    case "social-links":
      return {};
    case "references":
      return Array.from({ length: field.count }, () => ({ url: "", note: "" }));
    case "list":
      return [{ title: "", description: "" }];
    default:
      return "";
  }
}

export function initialValues(template: TemplateDefinition, answers: AnswerMap): Record<string, AnswerValue> {
  const values: Record<string, AnswerValue> = {};
  for (const field of template.sections.flatMap((s) => s.fields)) {
    if (!isAnswerField(field)) continue;
    const saved = answers[field.key];
    if (saved === undefined) {
      values[field.key] = emptyValue(field);
    } else if (field.type === "weekly-hours") {
      values[field.key] = { ...emptyHours(), ...(saved as WeeklyHoursValue) };
    } else if (field.type === "references") {
      const refs = [...(saved as { url: string; note: string }[])];
      while (refs.length < field.count) refs.push({ url: "", note: "" });
      values[field.key] = refs;
    } else {
      values[field.key] = saved;
    }
  }
  return values;
}
