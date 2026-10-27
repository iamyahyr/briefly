"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE } from "@/i18n/request";
import { setWorkspaceLogo, updateBranding, type BrandingInput } from "@/server/dal/workspace";
import { DomainError } from "@/server/dal/errors";
import { requireUser } from "@/server/session";
import { runAction } from "./result";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function updateBrandingAction(input: BrandingInput) {
  const user = await requireUser();
  return runAction(async () => {
    await updateBranding(user.id, input);
    revalidatePath("/settings");
  });
}

export async function uploadLogoAction(formData: FormData) {
  const user = await requireUser();
  return runAction(async () => {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new DomainError("invalid_input");
    await setWorkspaceLogo(user.id, { name: file.name, buffer: Buffer.from(await file.arrayBuffer()) });
    revalidatePath("/settings");
  });
}

export async function removeLogoAction() {
  const user = await requireUser();
  return runAction(async () => {
    await setWorkspaceLogo(user.id, null);
    revalidatePath("/settings");
  });
}
