"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ReferenceValue } from "@/templates/types";

type Props = { id: string; value: ReferenceValue[]; onChange: (value: ReferenceValue[]) => void };

export function ReferencesInput({ id, value, onChange }: Props) {
  const t = useTranslations("fields");
  const set = (index: number, patch: Partial<ReferenceValue>) =>
    onChange(value.map((ref, i) => (i === index ? { ...ref, ...patch } : ref)));

  return (
    <ol className="grid gap-3">
      {value.map((ref, index) => (
        <li key={index} className="grid gap-2 rounded-xl border bg-muted/30 p-3">
          <span className="text-xs font-medium text-muted-foreground">
            {t("referenceN", { n: index + 1 })}
          </span>
          <Input
            id={index === 0 ? id : undefined}
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-label={`${t("referenceN", { n: index + 1 })} — ${t("referenceUrl")}`}
            value={ref.url}
            maxLength={2048}
            onChange={(e) => set(index, { url: e.target.value })}
            className="bg-background"
          />
          <Textarea
            placeholder={t("referenceNote")}
            aria-label={`${t("referenceN", { n: index + 1 })} — ${t("referenceNote")}`}
            value={ref.note}
            maxLength={500}
            rows={2}
            onChange={(e) => set(index, { note: e.target.value })}
            className="min-h-0 bg-background"
          />
        </li>
      ))}
    </ol>
  );
}
