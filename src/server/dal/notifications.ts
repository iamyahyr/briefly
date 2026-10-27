import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { briefs, clients, notifications } from "@/server/db/schema";

export async function unreadCount(ownerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.ownerId, ownerId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function listNotifications(ownerId: string, limit = 10) {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      briefId: briefs.id,
      briefTitle: briefs.title,
      clientName: clients.name,
    })
    .from(notifications)
    .innerJoin(briefs, eq(briefs.id, notifications.briefId))
    .innerJoin(clients, eq(clients.id, briefs.clientId))
    .where(eq(notifications.ownerId, ownerId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markAllRead(ownerId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.ownerId, ownerId), isNull(notifications.readAt)));
}

/** Opening a brief marks its notifications as read. */
export async function markBriefNotificationsRead(ownerId: string, briefId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.ownerId, ownerId),
        eq(notifications.briefId, briefId),
        isNull(notifications.readAt),
      ),
    );
}
