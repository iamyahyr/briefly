import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { enabledSocialProviders } from "@/server/auth";
import { AuthForm } from "../auth-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("signIn") };
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="sign-in" providers={enabledSocialProviders()} />
    </Suspense>
  );
}
