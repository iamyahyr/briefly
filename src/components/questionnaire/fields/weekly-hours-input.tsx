"use client";

import { Copy, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { WEEK_DAYS, type WeekDay, type WeeklyHoursValue } from "@/templates/types";

type Props = { id: string; value: WeeklyHoursValue; onChange: (value: WeeklyHoursValue) => void };

const MAX_RANGES = 3;

export function WeeklyHoursInput({ id, value, onChange }: Props) {
  const t = useTranslations("fields");

  const update = (day: WeekDay, next: WeeklyHoursValue[WeekDay]) => onChange({ ...value, [day]: next });

  return (
    <div id={id} className="divide-y rounded-xl border">
      {WEEK_DAYS.map((day) => {
        const entry = value[day] ?? { closed: false, ranges: [] };
        return (
          <div key={day} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
            <div className="flex items-center justify-between gap-3 sm:w-40 sm:pt-1.5">
              <span className="text-sm font-medium">{t(`days.${day}`)}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={entry.closed}
                  onCheckedChange={(checked) =>
                    update(day, { closed: !!checked, ranges: checked ? [] : entry.ranges })
                  }
                />
                {t("closed")}
              </label>
            </div>
            {!entry.closed && (
              <div className="flex flex-1 flex-col gap-2">
                {entry.ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${t(`days.${day}`)} ${t("from")}`}
                      value={range.open}
                      className="h-9 w-full sm:w-32"
                      onChange={(e) => {
                        const ranges = entry.ranges.map((r, j) =>
                          j === i ? { ...r, open: e.target.value } : r,
                        );
                        update(day, { ...entry, ranges });
                      }}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      aria-label={`${t(`days.${day}`)} ${t("to")}`}
                      value={range.close}
                      className="h-9 w-full sm:w-32"
                      onChange={(e) => {
                        const ranges = entry.ranges.map((r, j) =>
                          j === i ? { ...r, close: e.target.value } : r,
                        );
                        update(day, { ...entry, ranges });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("remove")}
                      onClick={() =>
                        update(day, { ...entry, ranges: entry.ranges.filter((_, j) => j !== i) })
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                {entry.ranges.length < MAX_RANGES && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start text-primary"
                    onClick={() =>
                      update(day, {
                        ...entry,
                        ranges: [
                          ...entry.ranges,
                          entry.ranges.length ? { open: "", close: "" } : { open: "09:00", close: "14:00" },
                        ],
                      })
                    }
                  >
                    <Plus /> {t("addRange")}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            const monday = value.mon;
            onChange(
              Object.fromEntries(
                WEEK_DAYS.map((d) => [
                  d,
                  { closed: monday.closed, ranges: monday.ranges.map((r) => ({ ...r })) },
                ]),
              ) as unknown as WeeklyHoursValue,
            );
          }}
        >
          <Copy /> {t("copyToAll")}
        </Button>
      </div>
    </div>
  );
}
