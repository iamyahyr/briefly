"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientInput, type ClientInput } from "@/lib/schemas";
import { createClientAction, updateClientAction } from "@/server/actions/clients";

type Props = {
  trigger: React.ReactNode;
  client?: { id: string } & ClientInput;
};

export function ClientFormDialog({ trigger, client }: Props) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientInput),
    defaultValues: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      notes: client?.notes ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const err = (key: keyof ClientInput) => {
    const message = errors[key]?.message;
    return message ? tErrors(message as "required") : undefined;
  };

  async function onSubmit(values: ClientInput) {
    const result = client ? await updateClientAction(client.id, values) : await createClientAction(values);
    if (!result.ok) {
      toast.error(tErrors(result.error, { max: 0 }));
      return;
    }
    toast.success(client ? t("updated") : t("created"));
    setOpen(false);
    if (!client) {
      form.reset();
      if (result.data) router.push(`/clients/${result.data.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? t("edit") : t("new")}</DialogTitle>
          <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <form id="client-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormField id="client-name" label={t("name")} error={err("name")} required>
            <Input id="client-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="client-email" label={t("email")} error={err("email")}>
              <Input
                id="client-email"
                type="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
            </FormField>
            <FormField id="client-phone" label={t("phone")} error={err("phone")}>
              <Input id="client-phone" type="tel" {...form.register("phone")} />
            </FormField>
          </div>
          <FormField id="client-notes" label={t("notes")} hint={t("notesHint")} error={err("notes")}>
            <Textarea id="client-notes" rows={3} {...form.register("notes")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" form="client-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {client ? tCommon("saveChanges") : tCommon("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
