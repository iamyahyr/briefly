"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale, Option } from "@/templates/types";

type Props = {
  id: string;
  options: Option[];
  allowOther?: boolean;
  locale: Locale;
  value: string[];
  onChange: (value: string[]) => void;
};

export function MultiselectInput({ id, options, allowOther, locale, value, onChange }: Props) {
  const t = useTranslations("fields");
  const [other, setOther] = useState("");
  const known = new Set(options.map((o) => o.value));
  const custom = value.filter((v) => !known.has(v));

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  function addOther() {
    const v = other.trim().slice(0, 100);
    if (v && !value.includes(v)) onChange([...value, v]);
    setOther("");
  }

  return (
    <div className="grid gap-3">
      <div id={id} role="group" className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggle(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors hover:border-primary/60",
                selected && "border-primary bg-primary text-primary-foreground hover:border-primary",
              )}
            >
              {selected && <Check className="size-3.5" />}
              {option.label[locale]}
            </button>
          );
        })}
        {custom.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary py-2 pr-2 pl-3.5 text-sm text-primary-foreground"
          >
            {v}
            <button type="button" aria-label={`${t("remove")} ${v}`} onClick={() => toggle(v)}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      {allowOther && (
        <Input
          aria-label={t("addOther")}
          placeholder={`${t("addOther")} — ${t("otherPlaceholder")}`}
          value={other}
          maxLength={100}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOther();
            }
          }}
          onBlur={addOther}
          className="max-w-sm"
        />
      )}
    </div>
  );
}
