"use client";

import { Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { removeLogoAction, updateBrandingAction, uploadLogoAction } from "@/server/actions/settings";

type Props = { defaultName: string; displayName: string; accentColor: string; logoUrl: string | null };

export function BrandingForm({ defaultName, displayName, accentColor, logoUrl }: Props) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [name, setName] = useState(displayName);
  const [color, setColor] = useState(accentColor || "#4f46e5");
  const [useColor, setUseColor] = useState(!!accentColor);
  const [pending, startTransition] = useTransition();
  const [logoPending, startLogoTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateBrandingAction({ displayName: name, accentColor: useColor ? color : "" });
      if (!result.ok) toast.error(tErrors(result.error, { max: 0 }));
      else toast.success(t("saved"));
    });
  }

  function uploadLogo(file: File) {
    const data = new FormData();
    data.set("file", file);
    startLogoTransition(async () => {
      const result = await uploadLogoAction(data);
      if (!result.ok) toast.error(tErrors(result.error, { max: 5 }));
      else toast.success(t("saved"));
    });
  }

  return (
    <div className="grid max-w-md gap-6">
      <div className="grid gap-2">
        <span className="text-sm font-medium">{t("logo")}</span>
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center overflow-hidden rounded-xl border bg-muted">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={t("logo")} className="size-full object-contain p-1" />
            ) : (
              <Upload className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={logoPending}
              onClick={() => fileInput.current?.click()}
            >
              {logoPending && <Loader2 className="animate-spin" />}
              {t("uploadLogo")}
            </Button>
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                disabled={logoPending}
                onClick={() => startLogoTransition(async () => void (await removeLogoAction()))}
              >
                {t("removeLogo")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-4">
        <FormField id="display-name" label={t("displayName")} hint={t("displayNameHint")}>
          <Input
            id="display-name"
            value={name}
            maxLength={80}
            placeholder={defaultName}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>
        <FormField id="accent" label={t("accentColor")}>
          <div className="flex items-center gap-3">
            <input
              id="accent"
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setUseColor(true);
              }}
              className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
            />
            <code className="text-xs text-muted-foreground">{useColor ? color.toUpperCase() : "—"}</code>
            {useColor && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setUseColor(false)}>
                {tCommon("delete")}
              </Button>
            )}
          </div>
        </FormField>
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {tCommon("saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
}
