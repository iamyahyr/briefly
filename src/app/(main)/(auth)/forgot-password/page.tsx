"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email"));
    // Always show the same message so the form can't be used to discover accounts.
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    setSent(true);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
      </div>
      {sent ? (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {t("resetSent")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField id="email" label={t("email")}>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </FormField>
          <Button type="submit" className="h-10" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("sendResetLink")}
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
