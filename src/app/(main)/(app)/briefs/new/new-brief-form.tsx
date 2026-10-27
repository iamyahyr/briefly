"use client";

import { Check, LayoutTemplate, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createBriefAction } from "@/server/actions/briefs";
import type { Locale } from "@/templates/types";

type TemplateOption = { key: string; name: string; description: string; sections: number; fields: number };

type Props = {
  clients: { id: string; name: string }[];
  templates: TemplateOption[];
  defaultClientId?: string;
  defaultLocale: Locale;
};

const NEW_CLIENT = "__new__";

export function NewBriefForm({ clients, templates, defaultClientId, defaultLocale }: Props) {
  const t = useTranslations("briefs");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "");
  const [clientId, setClientId] = useState(defaultClientId ?? (clients.length ? "" : NEW_CLIENT));
  const [newClientName, setNewClientName] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const template = templates.find((tpl) => tpl.key === templateKey);
  const clientName = clientId === NEW_CLIENT ? newClientName : clients.find((c) => c.id === clientId)?.name;
  const suggestedTitle = template && clientName ? `${template.name} — ${clientName}` : "";
  const effectiveTitle = titleTouched ? title : suggestedTitle;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!clientId) nextErrors.client = tErrors("required");
    if (clientId === NEW_CLIENT && !newClientName.trim()) nextErrors.newClient = tErrors("required");
    if (!effectiveTitle.trim()) nextErrors.title = tErrors("required");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    const result = await createBriefAction({
      templateKey,
      title: effectiveTitle,
      locale,
      dueDate,
      ...(clientId === NEW_CLIENT ? { newClientName } : { clientId }),
    });
    if (!result.ok) {
      setPending(false);
      toast.error(tErrors(result.error, { max: 0 }));
      return;
    }
    toast.success(t("created"));
    router.push(`/briefs/${result.data.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8" noValidate>
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-medium">{t("template")}</legend>
        {templates.map((tpl) => {
          const selected = tpl.key === templateKey;
          return (
            <label
              key={tpl.key}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors hover:border-primary/50",
                selected && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
            >
              <input
                type="radio"
                name="template"
                value={tpl.key}
                checked={selected}
                onChange={() => setTemplateKey(tpl.key)}
                className="sr-only"
              />
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <LayoutTemplate className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{tpl.name}</div>
                <div className="text-sm text-muted-foreground">{tpl.description}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("sections", { count: tpl.sections })} · {t("fields", { count: tpl.fields })}
                </div>
              </div>
              {selected && <Check className="size-5 text-primary" />}
            </label>
          );
        })}
      </fieldset>

      <div className="grid gap-4">
        <FormField id="client" label={t("client")} error={errors.client} required>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="client" className="w-full" aria-invalid={!!errors.client}>
              <SelectValue placeholder={t("selectClient")} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value={NEW_CLIENT}>+ {t("orCreateClient")}</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {clientId === NEW_CLIENT && (
          <FormField id="new-client" label={t("newClientName")} error={errors.newClient} required>
            <Input
              id="new-client"
              value={newClientName}
              maxLength={120}
              onChange={(e) => setNewClientName(e.target.value)}
              aria-invalid={!!errors.newClient}
            />
          </FormField>
        )}

        <FormField id="title" label={t("title")} error={errors.title} required>
          <Input
            id="title"
            value={effectiveTitle}
            maxLength={160}
            placeholder={t("titlePlaceholder")}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            aria-invalid={!!errors.title}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="locale" label={t("locale")} hint={t("localeHint")}>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger id="locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">{tCommon("spanish")}</SelectItem>
                <SelectItem value="en">{tCommon("english")}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            id="due"
            label={
              <>
                {t("dueDate")}{" "}
                <span className="font-normal text-muted-foreground">({tCommon("optional")})</span>
              </>
            }
          >
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t("create")}
        </Button>
      </div>
    </form>
  );
}
