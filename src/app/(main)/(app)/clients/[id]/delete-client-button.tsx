"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Button } from "@/components/ui/button";
import { deleteClientAction } from "@/server/actions/clients";

export function DeleteClientButton({ id }: { id: string }) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  return (
    <ConfirmButton
      destructive
      title={t("deleteTitle")}
      description={t("deleteText")}
      confirmLabel={tCommon("delete")}
      trigger={
        <Button variant="ghost" className="text-destructive">
          <Trash2 /> {tCommon("delete")}
        </Button>
      }
      onConfirm={async () => {
        const result = await deleteClientAction(id);
        if (!result.ok) return void toast.error(tErrors(result.error, { max: 0 }));
        toast.success(t("deleted"));
        router.push("/clients");
      }}
    />
  );
}
