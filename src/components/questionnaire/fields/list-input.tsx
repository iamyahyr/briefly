"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ListItemValue } from "@/templates/types";

type Props = {
  id: string;
  value: ListItemValue[];
  onChange: (value: ListItemValue[]) => void;
  itemLabel: string;
  descriptionLabel?: string;
  max: number;
};

export function ListInput({ id, value, onChange, itemLabel, descriptionLabel, max }: Props) {
  const t = useTranslations("fields");
  const items = value.length ? value : [{ title: "", description: "" }];

  const set = (index: number, patch: Partial<ListItemValue>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Input
              id={index === 0 ? id : undefined}
              aria-label={`${itemLabel} ${index + 1}`}
              placeholder={itemLabel}
              value={item.title}
              maxLength={200}
              onChange={(e) => set(index, { title: e.target.value })}
              className="bg-background"
            />
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("remove")}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X />
              </Button>
            )}
          </div>
          {descriptionLabel && (
            <Textarea
              aria-label={`${descriptionLabel} ${index + 1}`}
              placeholder={descriptionLabel}
              value={item.description}
              maxLength={2000}
              rows={2}
              onChange={(e) => set(index, { description: e.target.value })}
              className="min-h-0 bg-background"
            />
          )}
        </div>
      ))}
      {items.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...items, { title: "", description: "" }])}
        >
          <Plus /> {t("addItem")}
        </Button>
      )}
    </div>
  );
}
