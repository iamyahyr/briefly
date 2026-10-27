"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "invalid">(
    !token || params.get("error") ? "invalid" : "idle",
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    const newPassword = String(new FormData(event.currentTarget).get("password"));
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    setState(error ? "invalid" : "done");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("resetTitle")}</h1>
      {state === "idle" ? (
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField id="password" label={t("newPassword")} hint={t("passwordHint")}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FormField>
          <Button type="submit" className="h-10" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("resetPassword")}
          </Button>
        </form>
      ) : (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {state === "done" ? t("resetDone") : t("resetInvalid")}
        </p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
