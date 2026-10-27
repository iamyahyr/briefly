import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { fontClassName } from "../../../fonts";
import "../../../globals.css";
import { getPublicBrief } from "./brief";

export async function generateMetadata({ params }: LayoutProps<"/b/[token]">): Promise<Metadata> {
  const brief = await getPublicBrief((await params).token);
  return {
    title: brief ? `${brief.title} · ${brief.brandName || brief.ownerName}` : "Briefly",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/** Separate root layout: the page language follows the brief, not the visitor's cookie. */
export default async function PublicBriefLayout({ children, params }: LayoutProps<"/b/[token]">) {
  const brief = await getPublicBrief((await params).token);
  const locale = brief?.locale ?? (await getLocale());
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} className={fontClassName} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
