import "server-only";
import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";
import { briefInput, briefUpdateInput, type BriefInput, type BriefUpdateInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { answers, briefAccess, briefs, clients, uploads, type BriefStatus } from "@/server/db/schema";
import { deleteObjects } from "@/server/storage";
import { getTemplate } from "@/templates/registry";
import type { AnswerMap } from "@/templates/types";
import { getClient } from "./clients";
import { DomainError, notFound } from "./errors";
import { decryptToken } from "@/server/security/tokens";

export type { BriefInput, BriefUpdateInput };

export async function listBriefs(ownerId: string, filter: { status?: BriefStatus; clientId?: string } = {}) {
  const conditions: SQL[] = [eq(briefs.ownerId, ownerId)];
  if (filter.status) conditions.push(eq(briefs.status, filter.status));
  if (filter.clientId) conditions.push(eq(briefs.clientId, filter.clientId));

  return db
    .select({
      id: briefs.id,
      title: briefs.title,
      status: briefs.status,
      progress: briefs.progress,
      dueDate: briefs.dueDate,
      submittedAt: briefs.submittedAt,
      updatedAt: briefs.updatedAt,
      templateKey: briefs.templateKey,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(briefs)
    .innerJoin(clients, eq(clients.id, briefs.clientId))
    .where(and(...conditions))
    .orderBy(desc(briefs.updatedAt));
}

export async function briefCountsByStatus(ownerId: string): Promise<Record<BriefStatus, number>> {
  const rows = await db
    .select({ status: briefs.status, n: count() })
    .from(briefs)
    .where(eq(briefs.ownerId, ownerId))
    .groupBy(briefs.status);
  const result: Record<BriefStatus, number> = { draft: 0, waiting: 0, received: 0, completed: 0 };
  for (const row of rows) result[row.status] = row.n;
  return result;
}

async function getOwnedBrief(ownerId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound();
  const brief = await db.query.briefs.findFirst({
    where: and(eq(briefs.id, id), eq(briefs.ownerId, ownerId)),
  });
  if (!brief) throw notFound();
  return brief;
}

/** Everything the review screen needs. Throws not_found for briefs of other users. */
export async function getBriefDetail(ownerId: string, id: string) {
  const brief = await getOwnedBrief(ownerId, id);
  const [client, answerRows, files, access] = await Promise.all([
    getClient(ownerId, brief.clientId),
    db.select().from(answers).where(eq(answers.briefId, id)),
    db
      .select({
        id: uploads.id,
        fieldKey: uploads.fieldKey,
        originalName: uploads.originalName,
        mimeType: uploads.mimeType,
        sizeBytes: uploads.sizeBytes,
        hasThumbnail: uploads.thumbnailKey,
        createdAt: uploads.createdAt,
      })
      .from(uploads)
      .where(eq(uploads.briefId, id))
      .orderBy(asc(uploads.createdAt)),
    db.query.briefAccess.findFirst({
      where: and(eq(briefAccess.briefId, id), isNull(briefAccess.revokedAt)),
      orderBy: desc(briefAccess.createdAt),
    }),
  ]);

  const answerMap: AnswerMap = Object.fromEntries(answerRows.map((a) => [a.fieldKey, a.value]));
  const token = access ? decryptToken(access.tokenCiphertext) : null;
  const expired = !!access?.expiresAt && access.expiresAt <= new Date();

  return {
    brief,
    client,
    answers: answerMap,
    uploads: files.map((f) => ({ ...f, hasThumbnail: !!f.hasThumbnail })),
    access:
      access && token ? { token, expiresAt: access.expiresAt, expired, createdAt: access.createdAt } : null,
  };
}

export async function createBrief(ownerId: string, input: BriefInput) {
  const parsed = briefInput.safeParse(input);
  if (!parsed.success) throw new DomainError("invalid_input");
  const data = parsed.data;

  await getClient(ownerId, data.clientId);
  const template = getTemplate(data.templateKey);
  if (!template) throw new DomainError("invalid_input");

  const [row] = await db
    .insert(briefs)
    .values({
      ownerId,
      clientId: data.clientId,
      title: data.title,
      templateKey: template.key,
      templateVersion: template.version,
      templateSnapshot: template,
      locale: data.locale,
      dueDate: data.dueDate || null,
    })
    .returning();
  return row;
}

export async function updateBrief(ownerId: string, id: string, input: BriefUpdateInput) {
  const parsed = briefUpdateInput.safeParse(input);
  if (!parsed.success) throw new DomainError("invalid_input");
  await getOwnedBrief(ownerId, id);
  const [row] = await db
    .update(briefs)
    .set({ title: parsed.data.title, locale: parsed.data.locale, dueDate: parsed.data.dueDate || null })
    .where(and(eq(briefs.id, id), eq(briefs.ownerId, ownerId)))
    .returning();
  return row;
}

export async function deleteBrief(ownerId: string, id: string) {
  await getOwnedBrief(ownerId, id);
  const files = await db
    .select({ key: uploads.storageKey, thumb: uploads.thumbnailKey })
    .from(uploads)
    .where(eq(uploads.briefId, id));
  await db.delete(briefs).where(and(eq(briefs.id, id), eq(briefs.ownerId, ownerId)));
  await deleteObjects(files.flatMap((f) => [f.key, f.thumb]));
}

/** Storage keys of the brief's uploads, by upload id (for the ZIP export). */
export async function getBriefFileKeys(ownerId: string, id: string): Promise<Map<string, string>> {
  await getOwnedBrief(ownerId, id);
  const rows = await db
    .select({ id: uploads.id, key: uploads.storageKey })
    .from(uploads)
    .where(eq(uploads.briefId, id));
  return new Map(rows.map((r) => [r.id, r.key]));
}

/** received → completed */
export async function markBriefCompleted(ownerId: string, id: string) {
  const brief = await getOwnedBrief(ownerId, id);
  if (brief.status !== "received") throw new DomainError("locked");
  await db
    .update(briefs)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(briefs.id, id), eq(briefs.ownerId, ownerId)));
}

/** received/completed → waiting, so the client can edit again with the same link. */
export async function reopenBrief(ownerId: string, id: string) {
  const brief = await getOwnedBrief(ownerId, id);
  if (brief.status !== "received" && brief.status !== "completed") throw new DomainError("locked");
  await db
    .update(briefs)
    .set({ status: "waiting", submittedAt: null, completedAt: null })
    .where(and(eq(briefs.id, id), eq(briefs.ownerId, ownerId)));
}

export { getOwnedBrief };
