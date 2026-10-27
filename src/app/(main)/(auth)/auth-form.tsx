"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function AuthForm({ mode, providers }: { mode: Mode; providers: ("github" | "google")[] }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name: String(form.get("name")), email, password });

    if (error) {
      setPending(false);
      const code = error.code ?? "";
      if (code.includes("INVALID_EMAIL_OR_PASSWORD")) setError(t("invalidCredentials"));
      else if (code.includes("USER_ALREADY_EXISTS")) setError(t("emailTaken"));
      else if (code.includes("SIGN_UP_DISABLED") || code.includes("SIGNUP_DISABLED"))
        setError(t("signupDisabled"));
      else if (error.status === 429) setError(tErrors("rate_limited"));
      else setError(error.message ?? tErrors("generic"));
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{mode === "sign-in" ? t("signInTitle") : t("signUpTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "sign-in" ? t("signInSubtitle") : t("signUpSubtitle")}
        </p>
      </div>

      {providers.length > 0 && (
        <>
          <div className="grid gap-2">
            {providers.map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => authClient.signIn.social({ provider, callbackURL: next })}
              >
                {t("continueWith", { provider: provider === "github" ? "GitHub" : "Google" })}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === "sign-up" && (
          <FormField id="name" label={t("name")}>
            <Input id="name" name="name" autoComplete="name" required maxLength={80} />
          </FormField>
        )}
        <FormField id="email" label={t("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </FormField>
        <FormField
          id="password"
          label={t("password")}
          hint={mode === "sign-up" ? t("passwordHint") : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={8}
            required
          />
        </FormField>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {mode === "sign-in" ? t("signIn") : t("signUp")}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            <p>
              <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
                {t("forgotPassword")}
              </Link>
            </p>
            <p>
              {t("noAccount")}{" "}
              <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
                {t("signUp")}
              </Link>
            </p>
          </>
        ) : (
          <p>
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {t("signIn")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
