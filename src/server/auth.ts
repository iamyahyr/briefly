import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { sendMail } from "@/server/mail";

function createAuth() {
  const e = env();

  const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};
  if (e.GITHUB_CLIENT_ID && e.GITHUB_CLIENT_SECRET) {
    socialProviders.github = { clientId: e.GITHUB_CLIENT_ID, clientSecret: e.GITHUB_CLIENT_SECRET };
  }
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET };
  }

  return betterAuth({
    appName: "Briefly",
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: e.DISABLE_SIGNUP,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await sendMail({
          to: user.email,
          subject: "Reset your Briefly password / Restablece tu contraseña de Briefly",
          text: `Hi ${user.name},\n\nUse this link to set a new password (valid for 1 hour):\n${url}\n\n—\n\nHola ${user.name},\n\nUsa este enlace para crear una nueva contraseña (válido durante 1 hora):\n${url}\n`,
        });
      },
    },
    socialProviders,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: e.NODE_ENV !== "test",
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

/** Lazily created so the module can be imported at build time without secrets. */
export function getAuth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}

export function enabledSocialProviders(): ("github" | "google")[] {
  const e = env();
  const providers: ("github" | "google")[] = [];
  if (e.GITHUB_CLIENT_ID && e.GITHUB_CLIENT_SECRET) providers.push("github");
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) providers.push("google");
  return providers;
}
