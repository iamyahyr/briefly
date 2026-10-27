import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { briefAccess, briefs } from "@/server/db/schema";
import { createAccessLink, resolveToken, revokeAccessLinks } from "@/server/dal/access";
import { getBriefDetail } from "@/server/dal/briefs";
import { generateToken } from "@/server/security/tokens";
import { createSharedBrief, resetDatabase } from "./helpers";

describe("private brief links", () => {
  beforeEach(resetDatabase);

  it("opens only the brief it was created for", async () => {
    const first = await createSharedBrief();
    const second = await createSharedBrief();
    expect((await resolveToken(first.token))?.id).toBe(first.brief.id);
    expect((await resolveToken(second.token))?.id).toBe(second.brief.id);
  });

  it("never stores the token in clear", async () => {
    const { brief, token } = await createSharedBrief();
    const [row] = await db.select().from(briefAccess).where(eq(briefAccess.briefId, brief.id));
    expect(row!.tokenHash).not.toContain(token);
    expect(row!.tokenCiphertext).not.toContain(token);
  });

  it("moves a draft brief to 'waiting' and lets the owner copy the link again", async () => {
    const { owner, brief, token } = await createSharedBrief();
    const detail = await getBriefDetail(owner, brief.id);
    expect(detail.brief.status).toBe("waiting");
    expect(detail.access?.token).toBe(token);
  });

  it("rejects unknown, malformed, revoked and expired tokens", async () => {
    const { owner, brief, token } = await createSharedBrief();
    expect(await resolveToken(generateToken())).toBeNull();
    expect(await resolveToken("short")).toBeNull();
    expect(await resolveToken(`${token.slice(0, -1)}%`)).toBeNull();

    await revokeAccessLinks(owner, brief.id);
    expect(await resolveToken(token)).toBeNull();

    const expiring = await createAccessLink(owner, brief.id, new Date(Date.now() - 1000));
    expect(await resolveToken(expiring)).toBeNull();
  });

  it("invalidates the previous link when a new one is generated", async () => {
    const { owner, brief, token } = await createSharedBrief();
    const next = await createAccessLink(owner, brief.id, null);
    expect(await resolveToken(token)).toBeNull();
    expect((await resolveToken(next))?.id).toBe(brief.id);
  });

  it("stops working when the brief is deleted", async () => {
    const { brief, token } = await createSharedBrief();
    await db.delete(briefs).where(eq(briefs.id, brief.id));
    expect(await resolveToken(token)).toBeNull();
  });
});
