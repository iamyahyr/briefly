"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = { id: string; value: string[]; onChange: (value: string[]) => void; max: number };

const SUGGESTIONS = ["#111827", "#F59E0B", "#DC2626", "#059669", "#2563EB", "#7C3AED", "#DB2777", "#F5F0E6"];

export function ColorsInput({ id, value, onChange, max }: Props) {
  const t = useTranslations("fields");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {value.map((color, index) => (
          <div key={index} className="flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-1">
            <input
              type="color"
              aria-label={`${t("addColor")} ${index + 1}`}
              value={color}
              onChange={(e) => onChange(value.map((c, i) => (i === index ? e.target.value : c)))}
              className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
            />
            <code className="text-xs">{color.toUpperCase()}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("remove")}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X />
            </Button>
          </div>
        ))}
        {value.length < max && (
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([
                ...value,
                SUGGESTIONS.find((c) => !value.includes(c.toLowerCase()) && !value.includes(c)) ?? "#000000",
              ])
            }
          >
            <Plus /> {t("addColor")}
          </Button>
        )}
      </div>
      {value.length < max && (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {SUGGESTIONS.filter((c) => !value.map((v) => v.toUpperCase()).includes(c)).map((color) => (
            <button
              key={color}
              type="button"
              tabIndex={-1}
              onClick={() => onChange([...value, color])}
              className="size-6 rounded-full border shadow-xs transition-transform hover:scale-110"
              style={{ background: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
