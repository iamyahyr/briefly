"use client";

import { CheckCircle2, Download, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/app/confirm-button";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BriefStatus } from "@/server/db/schema";
import {
  completeBriefAction,
  deleteBriefAction,
  reopenBriefAction,
  updateBriefAction,
} from "@/server/actions/briefs";
import type { Locale } from "@/templates/types";

type Props = {
  brief: { id: string; status: BriefStatus; title: string; locale: Locale; dueDate: string };
};

export function BriefActions({ brief }: Props) {
  const t = useTranslations("briefs");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const report = (result: { ok: boolean; error?: string }, success: string) => {
    if (!result.ok) toast.error(tErrors((result.error ?? "generic") as "generic", { max: 0 }));
    else toast.success(success);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {brief.status === "received" && (
        <ConfirmButton
          title={t("markCompleted")}
          description={brief.title}
          confirmLabel={t("markCompleted")}
          trigger={
            <Button>
              <CheckCircle2 /> {t("markCompleted")}
            </Button>
          }
          onConfirm={async () => report(await completeBriefAction(brief.id), t("markedCompleted"))}
        />
      )}
      {(brief.status === "received" || brief.status === "completed") && (
        <ConfirmButton
          title={t("reopen")}
          description={t("reopenConfirm")}
          confirmLabel={t("reopen")}
          trigger={
            <Button variant="outline">
              <RotateCcw /> {t("reopen")}
            </Button>
          }
          onConfirm={async () => report(await reopenBriefAction(brief.id), t("reopened"))}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download /> {t("export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/briefs/${brief.id}/export?format=md`}>{t("exportMarkdown")}</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/briefs/${brief.id}/export?format=json`}>{t("exportJson")}</a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/briefs/${brief.id}/export?format=zip`}>{t("exportZip")}</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={tCommon("actions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> {t("settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> {tCommon("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditBriefDialog brief={brief} open={editing} onOpenChange={setEditing} />

      <ConfirmButton
        destructive
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle")}
        description={t("deleteText")}
        confirmLabel={tCommon("delete")}
        onConfirm={async () => {
          const result = await deleteBriefAction(brief.id);
          if (!result.ok) return void toast.error(tErrors(result.error, { max: 0 }));
          toast.success(t("deleted"));
          router.push("/dashboard");
        }}
      />
    </div>
  );
}

function EditBriefDialog({
  brief,
  open,
  onOpenChange,
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("briefs");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [title, setTitle] = useState(brief.title);
  const [locale, setLocale] = useState<Locale>(brief.locale);
  const [dueDate, setDueDate] = useState(brief.dueDate);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await updateBriefAction(brief.id, { title, locale, dueDate });
    setPending(false);
    if (!result.ok) return void toast.error(tErrors(result.error, { max: 0 }));
    toast.success(t("updated"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings")}</DialogTitle>
          <DialogDescription className="sr-only">{brief.title}</DialogDescription>
        </DialogHeader>
        <form id="edit-brief" onSubmit={save} className="grid gap-4">
          <FormField id="edit-title" label={t("title")} required>
            <Input
              id="edit-title"
              value={title}
              maxLength={160}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="edit-locale" label={t("locale")}>
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger id="edit-locale" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{tCommon("spanish")}</SelectItem>
                  <SelectItem value="en">{tCommon("english")}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="edit-due" label={t("dueDate")}>
              <Input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" form="edit-brief" disabled={pending || !title.trim()}>
            {tCommon("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
