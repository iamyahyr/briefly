import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { enabledSocialProviders } from "@/server/auth";
import { env } from "@/server/env";
import { AuthForm } from "../auth-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("signUp") };
}

export default async function SignupPage() {
  if (env().DISABLE_SIGNUP) {
    const t = await getTranslations("auth");
    return <p className="text-sm text-muted-foreground">{t("signupDisabled")}</p>;
  }
  return (
    <Suspense>
      <AuthForm mode="sign-up" providers={enabledSocialProviders()} />
    </Suspense>
  );
}
