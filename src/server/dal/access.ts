import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import { briefAccess, briefs, clients, uploads, user, workspaceSettings } from "@/server/db/schema";
import { encryptToken, generateToken, hashToken, TOKEN_PATTERN } from "@/server/security/tokens";
import { getOwnedBrief } from "./briefs";

/**
 * Creates a new private link for a brief. Any previous link stops working.
 * Returns the plaintext token, which is never stored in clear.
 */
export async function createAccessLink(ownerId: string, briefId: string, expiresAt: Date | null) {
  const brief = await getOwnedBrief(ownerId, briefId);
  const token = generateToken();

  await db.transaction(async (tx) => {
    await tx
      .update(briefAccess)
      .set({ revokedAt: new Date() })
      .where(and(eq(briefAccess.briefId, briefId), isNull(briefAccess.revokedAt)));
    await tx.insert(briefAccess).values({
      briefId,
      tokenHash: hashToken(token),
      tokenCiphertext: encryptToken(token),
      expiresAt,
    });
    if (brief.status === "draft") {
      await tx.update(briefs).set({ status: "waiting" }).where(eq(briefs.id, briefId));
    }
  });

  return token;
}

export async function revokeAccessLinks(ownerId: string, briefId: string) {
  await getOwnedBrief(ownerId, briefId);
  await db
    .update(briefAccess)
    .set({ revokedAt: new Date() })
    .where(and(eq(briefAccess.briefId, briefId), isNull(briefAccess.revokedAt)));
}

export type PublicBrief = NonNullable<Awaited<ReturnType<typeof resolveToken>>>;

/**
 * Resolves a token from a public URL into the brief it grants access to.
 * Returns null for malformed, unknown, revoked or expired tokens — callers
 * must answer with a plain 404 so nothing about the brief is revealed.
 */
export async function resolveToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const now = new Date();

  const [row] = await db
    .select({
      accessId: briefAccess.id,
      lastUsedAt: briefAccess.lastUsedAt,
      id: briefs.id,
      ownerId: briefs.ownerId,
      title: briefs.title,
      status: briefs.status,
      locale: briefs.locale,
      template: briefs.templateSnapshot,
      currentStep: briefs.currentStep,
      progress: briefs.progress,
      dueDate: briefs.dueDate,
      clientName: clients.name,
      ownerName: user.name,
      brandName: workspaceSettings.displayName,
      brandColor: workspaceSettings.accentColor,
      brandLogoId: workspaceSettings.logoUploadId,
    })
    .from(briefAccess)
    .innerJoin(briefs, eq(briefs.id, briefAccess.briefId))
    .innerJoin(clients, eq(clients.id, briefs.clientId))
    .innerJoin(user, eq(user.id, briefs.ownerId))
    .leftJoin(workspaceSettings, eq(workspaceSettings.ownerId, briefs.ownerId))
    .where(
      and(
        eq(briefAccess.tokenHash, hashToken(token)),
        isNull(briefAccess.revokedAt),
        or(isNull(briefAccess.expiresAt), gt(briefAccess.expiresAt, now)),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Record usage at most once a minute to avoid a write on every keystroke save.
  if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > 60_000) {
    await db.update(briefAccess).set({ lastUsedAt: now }).where(eq(briefAccess.id, row.accessId));
  }

  const { accessId: _accessId, lastUsedAt: _lastUsedAt, ...brief } = row;
  return brief;
}

/** The workspace logo can be shown on a public brief only through that brief's token. */
export async function isBrandLogo(brief: PublicBrief, uploadId: string) {
  if (brief.brandLogoId !== uploadId) return false;
  const logo = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, uploadId), eq(uploads.ownerId, brief.ownerId), isNull(uploads.briefId)),
  });
  return !!logo;
}
