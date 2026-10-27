import { z } from "zod";
import {
  WEEK_DAYS,
  isAnswerField,
  type AnswerField,
  type AnswerMap,
  type FieldDefinition,
  type SectionDefinition,
  type TemplateDefinition,
} from "./types";

/**
 * Builds Zod schemas from a template so the browser and the server share the
 * exact same rules.
 *
 * - "draft": shape and length checks only. Used for autosave, where half-typed
 *   answers (an email without its domain yet) must still be stored.
 * - "submit": also enforces required fields. Used when moving to the next step
 *   and on final submission.
 *
 * Error messages are i18n keys (see `errors.*` in messages/*.json).
 */
export type ValidationMode = "draft" | "submit";

export const ERROR_CODES = [
  "required",
  "too_long",
  "too_many",
  "invalid_email",
  "invalid_url",
  "invalid_phone",
  "invalid_date",
  "invalid_time",
  "invalid_option",
  "invalid_color",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

const PHONE = /^\+?[\d\s().-]{6,25}$/;
const URLISH = /^(https?:\/\/)?([\p{L}\d-]+\.)+[\p{L}\d-]{2,}(:\d+)?([/?#]\S*)?$/iu;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-f]{6}$/i;
const EMAIL = z.email();

const text = (max: number) => z.string().max(max, "too_long");

export const isUrlish = (v: string) => URLISH.test(v);

function baseSchema(field: AnswerField, mode: ValidationMode): z.ZodType {
  // Format checks only apply on submit; drafts just need the right shape and length.
  const optionalMatch = (max: number, test: (v: string) => boolean, code: ErrorCode) =>
    mode === "draft" ? text(max) : text(max).refine((v) => v.trim() === "" || test(v.trim()), code);

  switch (field.type) {
    case "text":
      return text(field.maxLength ?? 500);
    case "textarea":
      return text(field.maxLength ?? 5000);
    case "email":
      return optionalMatch(254, (v) => EMAIL.safeParse(v).success, "invalid_email");
    case "phone":
      return optionalMatch(25, (v) => PHONE.test(v), "invalid_phone");
    case "url":
      return optionalMatch(2048, isUrlish, "invalid_url");
    case "date":
      return optionalMatch(10, (v) => DATE.test(v) && !Number.isNaN(Date.parse(v)), "invalid_date");
    case "select": {
      const values = field.options.map((o) => o.value);
      return z.string().refine((v) => v === "" || values.includes(v), "invalid_option");
    }
    case "multiselect": {
      const values = field.options.map((o) => o.value);
      return z
        .array(text(100))
        .max(50, "too_many")
        .refine((arr) => field.allowOther || arr.every((v) => values.includes(v)), "invalid_option");
    }
    case "weekly-hours": {
      // Empty times are allowed: <input type="time"> is blank until both parts are set.
      const time = z.string().refine((v) => v === "" || TIME.test(v), "invalid_time");
      const day = z.object({
        closed: z.boolean(),
        ranges: z.array(z.object({ open: time, close: time })).max(3, "too_many"),
      });
      return z.object(Object.fromEntries(WEEK_DAYS.map((d) => [d, day])));
    }
    case "social-links":
      return z.partialRecord(z.enum(field.networks as [string, ...string[]]), text(300));
    case "colors":
      return z.array(z.string().regex(HEX, "invalid_color")).max(field.max ?? 10, "too_many");
    case "references":
      return z
        .array(z.object({ url: optionalMatch(2048, isUrlish, "invalid_url"), note: text(500) }))
        .max(field.count, "too_many");
    case "list":
      return z
        .array(z.object({ title: text(200), description: text(2000) }))
        .max(field.max ?? 50, "too_many");
  }
}

/** True when a value carries no real content (empty strings, untouched rows, etc.). */
export function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return !value;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.every(isEmptyValue);
  if (typeof value === "object") return Object.values(value).every(isEmptyValue);
  return false;
}

export function fieldSchema(field: AnswerField, mode: ValidationMode): z.ZodType {
  const schema = baseSchema(field, mode).optional();
  if (mode === "submit" && field.required) {
    return schema.refine((v) => !isEmptyValue(v), "required");
  }
  return schema;
}

export function sectionSchema(section: SectionDefinition, mode: ValidationMode) {
  return z.strictObject(
    Object.fromEntries(section.fields.filter(isAnswerField).map((f) => [f.key, fieldSchema(f, mode)])),
  );
}

/** Whole-brief schema; unknown keys are rejected so clients can't store arbitrary data. */
export function templateSchema(template: TemplateDefinition, mode: ValidationMode) {
  return z.strictObject(
    Object.fromEntries(
      allFields(template)
        .filter(isAnswerField)
        .map((f) => [f.key, fieldSchema(f, mode)]),
    ),
  );
}

export function allFields(template: TemplateDefinition): FieldDefinition[] {
  return template.sections.flatMap((s) => s.fields);
}

export type FieldErrors = Record<string, ErrorCode>;

/**
 * Full validation for submission: answers plus required file fields.
 * Returns the errors and the index of the first section that has one.
 */
export function validateForSubmit(
  template: TemplateDefinition,
  answers: AnswerMap,
  fileCounts: Record<string, number>,
): { errors: FieldErrors; firstInvalidSection: number | null } {
  const errors: FieldErrors = {};
  let firstInvalidSection: number | null = null;

  template.sections.forEach((section, index) => {
    for (const field of section.fields) {
      let code: ErrorCode | undefined;
      if (field.type === "file") {
        if (field.required && !fileCounts[field.key]) code = "required";
      } else if (isAnswerField(field)) {
        const result = fieldSchema(field, "submit").safeParse(answers[field.key]);
        if (!result.success) code = (result.error.issues[0]?.message as ErrorCode) ?? "required";
      }
      if (code) {
        errors[field.key] = code;
        firstInvalidSection ??= index;
      }
    }
  });

  return { errors, firstInvalidSection };
}

/** Share of answerable fields (including files) that have content, 0–100. */
export function completion(
  template: TemplateDefinition,
  answers: AnswerMap,
  fileCounts: Record<string, number>,
): number {
  const fields = allFields(template).filter((f) => f.type !== "notice");
  if (!fields.length) return 0;
  const filled = fields.filter((f) =>
    f.type === "file" ? (fileCounts[f.key] ?? 0) > 0 : !isEmptyValue(answers[f.key]),
  ).length;
  return Math.round((filled / fields.length) * 100);
}
