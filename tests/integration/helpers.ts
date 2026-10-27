import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { createAccessLink } from "@/server/dal/access";
import { createBrief } from "@/server/dal/briefs";
import { createClient } from "@/server/dal/clients";

export async function resetDatabase() {
  await db.execute(
    sql`truncate table notifications, uploads, answers, brief_access, briefs, clients, workspace_settings, session, account, verification, "user" cascade`,
  );
}

export async function createUser(name = "Test User") {
  const id = randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.test` });
  return id;
}

/** A user with a client, a brief and an active link. */
export async function createSharedBrief(ownerId?: string) {
  const owner = ownerId ?? (await createUser());
  const client = await createClient(owner, { name: "Cafetería Nube" });
  const brief = await createBrief(owner, {
    clientId: client.id,
    title: "Web Cafetería Nube",
    templateKey: "local-business",
    locale: "es",
  });
  const token = await createAccessLink(owner, brief.id, null);
  return { owner, client, brief, token };
}

/** A small but real PNG. */
export function pngBuffer(size = 8): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 3, background: "#c87828" } })
    .png()
    .toBuffer();
}

/** Bytes that start like a PDF, padded to the requested size. */
export function pdfBuffer(bytes: number): Buffer {
  const head = Buffer.from("%PDF-1.4\n%âãÏÓ\n");
  return Buffer.concat([head, Buffer.alloc(Math.max(0, bytes - head.length), 0x20)]);
}
