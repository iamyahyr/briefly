import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, isNull, sum } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db";
import { uploads } from "@/server/db/schema";
import { env } from "@/server/env";
import { checkFile, RASTER_IMAGE_TYPES, sanitizeFileName } from "@/server/security/file-validation";
import { deleteObjects, storage } from "@/server/storage";
import type { FileKind } from "@/templates/types";
import { DomainError, notFound } from "./errors";

export type UploadMeta = {
  id: string;
  fieldKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  hasThumbnail: boolean;
};

const MB = 1024 * 1024;

/**
 * Re-encodes raster images: applies EXIF rotation, strips metadata (GPS etc.)
 * and makes a small WebP thumbnail. Rejects files that fail to decode.
 */
async function processImage(buffer: Buffer, mime: string) {
  if (!RASTER_IMAGE_TYPES.has(mime) || mime === "image/gif") return { body: buffer, thumbnail: null };
  try {
    const image = sharp(buffer, { failOn: "error" }).rotate();
    const format =
      mime === "image/jpeg" ? "jpeg" : mime === "image/png" ? "png" : mime === "image/avif" ? "avif" : "webp";
    const [body, thumbnail] = await Promise.all([
      image.clone().toFormat(format).toBuffer(),
      image
        .clone()
        .resize(480, 480, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);
    return { body, thumbnail };
  } catch {
    throw new DomainError("file_type");
  }
}

type StoreInput = {
  ownerId: string;
  briefId: string | null;
  fieldKey: string;
  accept: FileKind[];
  maxFiles: number;
  file: { name: string; buffer: Buffer };
};

export async function storeUpload(input: StoreInput): Promise<UploadMeta> {
  const e = env();
  const check = await checkFile(input.file.buffer, input.accept, e.UPLOAD_MAX_FILE_MB * MB);
  if (!check.ok) throw new DomainError(check.error);

  if (input.briefId) {
    const [{ files }] = await db
      .select({ files: count() })
      .from(uploads)
      .where(and(eq(uploads.briefId, input.briefId), eq(uploads.fieldKey, input.fieldKey)));
    if (files >= input.maxFiles) throw new DomainError("too_many_files");

    const [{ total }] = await db
      .select({ total: sum(uploads.sizeBytes) })
      .from(uploads)
      .where(eq(uploads.briefId, input.briefId));
    if (Number(total ?? 0) + input.file.buffer.length > e.UPLOAD_MAX_BRIEF_MB * MB) {
      throw new DomainError("quota_exceeded");
    }
  }

  const { body, thumbnail } = await processImage(input.file.buffer, check.mime);
  const base = `${input.ownerId}/${input.briefId ?? "workspace"}/${randomUUID()}`;
  const storageKey = `${base}.${check.ext}`;
  const thumbnailKey = thumbnail ? `${base}-thumb.webp` : null;

  await storage().put(storageKey, body, check.mime);
  if (thumbnail && thumbnailKey) await storage().put(thumbnailKey, thumbnail, "image/webp");

  try {
    const [row] = await db
      .insert(uploads)
      .values({
        ownerId: input.ownerId,
        briefId: input.briefId,
        fieldKey: input.fieldKey,
        storageKey,
        thumbnailKey,
        originalName: sanitizeFileName(input.file.name),
        mimeType: check.mime,
        sizeBytes: body.length,
      })
      .returning();
    return toMeta(row);
  } catch (error) {
    await deleteObjects([storageKey, thumbnailKey]);
    throw error;
  }
}

export async function listBriefUploads(briefId: string): Promise<UploadMeta[]> {
  const rows = await db
    .select()
    .from(uploads)
    .where(eq(uploads.briefId, briefId))
    .orderBy(asc(uploads.createdAt));
  return rows.map(toMeta);
}

export async function fileCountsByField(briefId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ fieldKey: uploads.fieldKey, n: count() })
    .from(uploads)
    .where(eq(uploads.briefId, briefId))
    .groupBy(uploads.fieldKey);
  return Object.fromEntries(rows.map((r) => [r.fieldKey, r.n]));
}

export async function deleteBriefUpload(briefId: string, uploadId: string) {
  const [row] = await db
    .delete(uploads)
    .where(and(eq(uploads.id, uploadId), eq(uploads.briefId, briefId)))
    .returning();
  if (!row) throw notFound();
  await deleteObjects([row.storageKey, row.thumbnailKey]);
}

/** An upload owned by the user (brief file or workspace asset). */
export async function getOwnedUpload(ownerId: string, uploadId: string) {
  const row = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, uploadId), eq(uploads.ownerId, ownerId)),
  });
  if (!row) throw notFound();
  return row;
}

/** An upload that belongs to the given brief (used with a public token). */
export async function getBriefUpload(briefId: string, uploadId: string) {
  const row = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, uploadId), eq(uploads.briefId, briefId)),
  });
  if (!row) throw notFound();
  return row;
}

export async function getWorkspaceUpload(ownerId: string, uploadId: string) {
  const row = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, uploadId), eq(uploads.ownerId, ownerId), isNull(uploads.briefId)),
  });
  if (!row) throw notFound();
  return row;
}

function toMeta(row: typeof uploads.$inferSelect): UploadMeta {
  return {
    id: row.id,
    fieldKey: row.fieldKey,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    hasThumbnail: !!row.thumbnailKey,
  };
}
