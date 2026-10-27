"use client";

import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BriefStatus } from "@/server/db/schema";
import { createLinkAction, revokeLinkAction } from "@/server/actions/briefs";

type Props = {
  briefId: string;
  status: BriefStatus;
  appUrl: string;
  access: { token: string; expired: boolean; expiresAt: string | null } | null;
};

export function ShareCard({ briefId, appUrl, access }: Props) {
  const t = useTranslations("briefs");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const [expiry, setExpiry] = useState("0");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const url = access ? `${appUrl.replace(/\/$/, "")}/b/${access.token}` : null;

  function generate() {
    startTransition(async () => {
      const result = await createLinkAction(briefId, Number(expiry));
      if (!result.ok) return void toast.error(tErrors(result.error, { max: 0 }));
      toast.success(t("linkCreated"));
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const expirySelect = (
    <div className="grid gap-1.5">
      <Label htmlFor="expiry" className="text-xs text-muted-foreground">
        {t("expiry")}
      </Label>
      <Select value={expiry} onValueChange={setExpiry}>
        <SelectTrigger id="expiry" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">{t("expiryNever")}</SelectItem>
          <SelectItem value="7">{t("expiry7")}</SelectItem>
          <SelectItem value="30">{t("expiry30")}</SelectItem>
          <SelectItem value="90">{t("expiry90")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-primary" />
        <h2 className="text-sm font-medium">{t("shareTitle")}</h2>
      </div>

      {url && access ? (
        <>
          <p className="text-xs text-muted-foreground">{t("shareText")}</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              aria-label={t("shareTitle")}
              className="h-8 font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="icon" variant="outline" onClick={copy} aria-label={tCommon("copy")}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <p className={access.expired ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {access.expiresAt
              ? access.expired
                ? t("linkExpired", {
                    date: format.dateTime(new Date(access.expiresAt), { dateStyle: "medium" }),
                  })
                : t("expiresOn", {
                    date: format.dateTime(new Date(access.expiresAt), { dateStyle: "medium" }),
                  })
              : t("noExpiry")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink /> {t("openPreview")}
              </a>
            </Button>
            <ConfirmButton
              title={t("regenerateLink")}
              description={t("regenerateConfirm")}
              confirmLabel={t("regenerateLink")}
              trigger={
                <Button size="sm" variant="outline" disabled={pending}>
                  <RefreshCw /> {t("regenerateLink")}
                </Button>
              }
              onConfirm={async () => {
                const result = await createLinkAction(briefId, Number(expiry));
                if (!result.ok) toast.error(tErrors(result.error, { max: 0 }));
                else toast.success(t("linkCreated"));
              }}
            />
            <ConfirmButton
              destructive
              title={t("revokeConfirmTitle")}
              description={t("revokeConfirmText")}
              confirmLabel={t("revokeLink")}
              trigger={
                <Button size="sm" variant="ghost" className="text-destructive">
                  {t("revokeLink")}
                </Button>
              }
              onConfirm={async () => {
                const result = await revokeLinkAction(briefId);
                if (!result.ok) toast.error(tErrors(result.error, { max: 0 }));
                else toast.success(t("linkRevoked"));
              }}
            />
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">{t("expiry")}</summary>
            <div className="mt-2">{expirySelect}</div>
          </details>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("shareNone")}</p>
          {expirySelect}
          <Button className="w-full" onClick={generate} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
            {t("generateLink")}
          </Button>
        </>
      )}
    </div>
  );
}
