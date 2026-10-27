import "server-only";
import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { clientInput, type ClientInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { briefs, clients, uploads } from "@/server/db/schema";
import { deleteObjects } from "@/server/storage";
import { DomainError, notFound } from "./errors";

export type { ClientInput };

const emptyToNull = (v: string | undefined) => (v ? v : null);

export async function listClients(ownerId: string, search?: string) {
  const term = search?.trim();
  const where = term
    ? and(
        eq(clients.ownerId, ownerId),
        or(ilike(clients.name, `%${term}%`), ilike(clients.email, `%${term}%`)),
      )
    : eq(clients.ownerId, ownerId);

  return db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      createdAt: clients.createdAt,
      briefCount: count(briefs.id),
    })
    .from(clients)
    .leftJoin(briefs, eq(briefs.clientId, clients.id))
    .where(where)
    .groupBy(clients.id)
    .orderBy(asc(clients.name));
}

export async function getClient(ownerId: string, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound();
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.ownerId, ownerId)),
  });
  if (!client) throw notFound();
  return client;
}

export async function createClient(ownerId: string, input: ClientInput) {
  const data = parse(input);
  const [row] = await db
    .insert(clients)
    .values({
      ownerId,
      name: data.name,
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      notes: emptyToNull(data.notes),
    })
    .returning();
  return row;
}

export async function updateClient(ownerId: string, id: string, input: ClientInput) {
  const data = parse(input);
  const [row] = await db
    .update(clients)
    .set({
      name: data.name,
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      notes: emptyToNull(data.notes),
    })
    .where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)))
    .returning();
  if (!row) throw notFound();
  return row;
}

/** Deletes the client, its briefs and every stored file that belonged to them. */
export async function deleteClient(ownerId: string, id: string) {
  await getClient(ownerId, id);
  const briefIds = db.select({ id: briefs.id }).from(briefs).where(eq(briefs.clientId, id));
  const files = await db
    .select({ key: uploads.storageKey, thumb: uploads.thumbnailKey })
    .from(uploads)
    .where(and(eq(uploads.ownerId, ownerId), inArray(uploads.briefId, briefIds)));
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.ownerId, ownerId)));
  await deleteObjects(files.flatMap((f) => [f.key, f.thumb]));
}

function parse(input: ClientInput): ClientInput {
  const result = clientInput.safeParse(input);
  if (!result.success) throw new DomainError("invalid_input");
  return result.data;
}
