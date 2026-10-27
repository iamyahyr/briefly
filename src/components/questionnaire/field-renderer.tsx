"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AnswerField,
  AnswerValue,
  FieldDefinition,
  ListItemValue,
  Locale,
  ReferenceValue,
  WeeklyHoursValue,
} from "@/templates/types";
import { ColorsInput } from "./fields/colors-input";
import { ListInput } from "./fields/list-input";
import { MultiselectInput } from "./fields/multiselect-input";
import { ReferencesInput } from "./fields/references-input";
import { SocialLinksInput } from "./fields/social-links-input";
import { WeeklyHoursInput } from "./fields/weekly-hours-input";

type ControlProps = {
  field: AnswerField;
  id: string;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  invalid: boolean;
  describedBy?: string;
  locale: Locale;
};

function Control({ field, id, value, onChange, invalid, describedBy, locale }: ControlProps) {
  const t = useTranslations("fields");
  const aria = { "aria-invalid": invalid || undefined, "aria-describedby": describedBy };
  const placeholder = "placeholder" in field ? field.placeholder?.[locale] : undefined;

  switch (field.type) {
    case "text":
      return (
        <Input
          id={id}
          {...aria}
          value={value as string}
          placeholder={placeholder}
          maxLength={field.maxLength ?? 500}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "textarea":
      return (
        <Textarea
          id={id}
          {...aria}
          value={value as string}
          placeholder={placeholder}
          rows={field.rows ?? 4}
          maxLength={field.maxLength ?? 5000}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "email":
      return (
        <Input
          id={id}
          {...aria}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value as string}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "phone":
      return (
        <Input
          id={id}
          {...aria}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value as string}
          placeholder={placeholder}
          maxLength={25}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "url":
      return (
        <Input
          id={id}
          {...aria}
          type="url"
          inputMode="url"
          value={value as string}
          placeholder={placeholder ?? "https://"}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
      return (
        <Input
          id={id}
          {...aria}
          type="date"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-full sm:w-56"
        />
      );
    case "select":
      return (
        <Select value={(value as string) || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} {...aria} className="w-full sm:w-80">
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multiselect":
      return (
        <MultiselectInput
          id={id}
          options={field.options}
          allowOther={field.allowOther}
          locale={locale}
          value={value as string[]}
          onChange={onChange}
        />
      );
    case "weekly-hours":
      return <WeeklyHoursInput id={id} value={value as WeeklyHoursValue} onChange={onChange} />;
    case "social-links":
      return (
        <SocialLinksInput
          id={id}
          networks={field.networks}
          value={value as Record<string, string>}
          onChange={onChange}
        />
      );
    case "colors":
      return <ColorsInput id={id} value={value as string[]} onChange={onChange} max={field.max ?? 10} />;
    case "references":
      return <ReferencesInput id={id} value={value as ReferenceValue[]} onChange={onChange} />;
    case "list":
      return (
        <ListInput
          id={id}
          value={value as ListItemValue[]}
          onChange={onChange}
          itemLabel={field.itemLabel[locale]}
          descriptionLabel={field.descriptionLabel?.[locale]}
          max={field.max ?? 50}
        />
      );
  }
}

type FieldShellProps = {
  field: Exclude<FieldDefinition, { type: "notice" }>;
  locale: Locale;
  error?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
};

/** Label, help text and error around any field control. */
export function FieldShell({ field, locale, error, children }: FieldShellProps) {
  const t = useTranslations("questionnaire");
  const id = `field-${field.key}`;
  const help = field.help?.[locale];
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  // Groups of inputs get a legend-like label; single inputs a real <label>.
  const Label = [
    "multiselect",
    "weekly-hours",
    "social-links",
    "colors",
    "references",
    "list",
    "file",
  ].includes(field.type)
    ? "p"
    : "label";

  return (
    <div className="grid gap-2" data-field={field.key} data-invalid={!!error || undefined}>
      <Label
        {...(Label === "label" ? { htmlFor: id } : { id: `${id}-label` })}
        className="text-[0.95rem] leading-snug font-medium"
      >
        {field.label[locale]}
        {field.required && (
          <span className="ml-0.5 text-destructive" aria-label={t("required")}>
            *
          </span>
        )}
      </Label>
      {help && (
        <p id={`${id}-help`} className="-mt-1 text-sm text-muted-foreground">
          {help}
        </p>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AnswerFieldRenderer(props: {
  field: AnswerField;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
  locale: Locale;
}) {
  return (
    <FieldShell field={props.field} locale={props.locale} error={props.error}>
      {({ id, describedBy, invalid }) => (
        <Control
          field={props.field}
          id={id}
          value={props.value}
          onChange={props.onChange}
          invalid={invalid}
          describedBy={describedBy}
          locale={props.locale}
        />
      )}
    </FieldShell>
  );
}

export function Notice({ tone, text }: { tone: "info" | "warning"; text: string }) {
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-xl border p-4 text-sm",
        tone === "warning"
          ? "border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
          : "bg-muted/50",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}
