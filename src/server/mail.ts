import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/env";

type Mail = { to: string; subject: string; text: string };

let transport: Transporter | undefined;

/**
 * Sends an email through SMTP when configured. Without SMTP (typical for local
 * development or a single-user self-hosted install) the message is logged so
 * links such as password resets are still usable.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const e = env();
  if (!e.SMTP_HOST) {
    console.info(`[mail] SMTP not configured. Would send to ${mail.to}:\n${mail.subject}\n\n${mail.text}`);
    return;
  }
  transport ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: e.SMTP_FROM, ...mail });
}
