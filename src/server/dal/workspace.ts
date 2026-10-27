import "server-only";
import { eq } from "drizzle-orm";
import { brandingInput, type BrandingInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { uploads, workspaceSettings } from "@/server/db/schema";
import { deleteObjects } from "@/server/storage";
import { DomainError } from "./errors";
import { storeUpload } from "./uploads";

export type { BrandingInput };

export async function getWorkspace(ownerId: string) {
  const row = await db.query.workspaceSettings.findFirst({ where: eq(workspaceSettings.ownerId, ownerId) });
  return {
    displayName: row?.displayName ?? "",
    accentColor: row?.accentColor ?? "",
    logoUploadId: row?.logoUploadId ?? null,
  };
}

export async function updateBranding(ownerId: string, input: BrandingInput) {
  const parsed = brandingInput.safeParse(input);
  if (!parsed.success) throw new DomainError("invalid_input");
  const values = {
    displayName: parsed.data.displayName || null,
    accentColor: parsed.data.accentColor || null,
  };
  await db
    .insert(workspaceSettings)
    .values({ ownerId, ...values })
    .onConflictDoUpdate({ target: workspaceSettings.ownerId, set: values });
}

/** Replaces the workspace logo shown on client questionnaires. */
export async function setWorkspaceLogo(ownerId: string, file: { name: string; buffer: Buffer } | null) {
  const current = await getWorkspace(ownerId);
  let logoUploadId: string | null = null;
  if (file) {
    const meta = await storeUpload({
      ownerId,
      briefId: null,
      fieldKey: "workspace_logo",
      accept: ["image", "svg"],
      maxFiles: 1,
      file,
    });
    logoUploadId = meta.id;
  }
  await db
    .insert(workspaceSettings)
    .values({ ownerId, logoUploadId })
    .onConflictDoUpdate({ target: workspaceSettings.ownerId, set: { logoUploadId } });

  if (current.logoUploadId) {
    const [old] = await db.delete(uploads).where(eq(uploads.id, current.logoUploadId)).returning();
    if (old) await deleteObjects([old.storageKey, old.thumbnailKey]);
  }
}
