/**
 * Declarative brief templates.
 *
 * A template is plain data: sections made of fields. The same definition
 * drives the client questionnaire, validation (see schema-builder.ts),
 * the review screen and the exports. Briefs store a snapshot of the
 * template they were created from, so a definition must be serialisable.
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<Locale, string>;

export type Option = { value: string; label: LocalizedText };

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const FILE_KINDS = ["image", "svg", "pdf"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

type BaseField = {
  /** Unique within the template. Used as the answer key — never rename once published. */
  key: string;
  label: LocalizedText;
  help?: LocalizedText;
  placeholder?: LocalizedText;
  required?: boolean;
};

export type TextField = BaseField & { type: "text"; maxLength?: number };
export type TextareaField = BaseField & { type: "textarea"; maxLength?: number; rows?: number };
export type EmailField = BaseField & { type: "email" };
export type PhoneField = BaseField & { type: "phone" };
export type UrlField = BaseField & { type: "url" };
export type DateField = BaseField & { type: "date" };
export type SelectField = BaseField & { type: "select"; options: Option[] };
export type MultiselectField = BaseField & {
  type: "multiselect";
  options: Option[];
  /** Lets the client add free-text values. */
  allowOther?: boolean;
};
export type WeeklyHoursField = BaseField & { type: "weekly-hours" };
export type SocialLinksField = BaseField & { type: "social-links"; networks: string[] };
export type ColorsField = BaseField & { type: "colors"; max?: number };
export type ReferencesField = BaseField & { type: "references"; count: number };
export type ListField = BaseField & {
  type: "list";
  itemLabel: LocalizedText;
  descriptionLabel?: LocalizedText;
  max?: number;
};
export type FileField = BaseField & { type: "file"; accept: FileKind[]; maxFiles: number };
/** Informational block without an answer (e.g. "never share passwords here"). */
export type NoticeField = {
  type: "notice";
  key: string;
  tone: "info" | "warning";
  text: LocalizedText;
};

export type FieldDefinition =
  | TextField
  | TextareaField
  | EmailField
  | PhoneField
  | UrlField
  | DateField
  | SelectField
  | MultiselectField
  | WeeklyHoursField
  | SocialLinksField
  | ColorsField
  | ReferencesField
  | ListField
  | FileField
  | NoticeField;

export type FieldType = FieldDefinition["type"];

/** Fields that store a value in the `answers` table. */
export type AnswerField = Exclude<FieldDefinition, NoticeField | FileField>;

export type SectionDefinition = {
  key: string;
  title: LocalizedText;
  description?: LocalizedText;
  fields: FieldDefinition[];
};

export type TemplateDefinition = {
  key: string;
  /** Bump whenever fields change. Existing briefs keep their snapshot. */
  version: number;
  name: LocalizedText;
  description: LocalizedText;
  sections: SectionDefinition[];
};

// ─── Answer value shapes ───────────────────────────────────────────────

export type TimeRange = { open: string; close: string };
export type WeeklyHoursValue = Record<WeekDay, { closed: boolean; ranges: TimeRange[] }>;
export type ReferenceValue = { url: string; note: string };
export type ListItemValue = { title: string; description: string };

export type AnswerValue =
  string | string[] | WeeklyHoursValue | Record<string, string> | ReferenceValue[] | ListItemValue[];

export type AnswerMap = Record<string, AnswerValue | undefined>;

export function isAnswerField(field: FieldDefinition): field is AnswerField {
  return field.type !== "notice" && field.type !== "file";
}

export function t(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en;
}
