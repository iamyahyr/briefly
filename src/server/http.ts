import "server-only";
import { Readable } from "node:stream";
import { DomainError } from "@/server/dal/errors";
import { storage } from "@/server/storage";
import type { uploads } from "@/server/db/schema";

const INLINE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
]);

export function contentDisposition(type: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Streams a stored upload. SVGs (which can contain scripts) and unknown types
 * are always downloaded, never rendered, and sandboxed by CSP just in case.
 */
export async function fileResponse(
  upload: typeof uploads.$inferSelect,
  options: { thumbnail?: boolean; download?: boolean } = {},
) {
  const useThumb = options.thumbnail && upload.thumbnailKey;
  const key = useThumb ? upload.thumbnailKey! : upload.storageKey;
  const type = useThumb ? "image/webp" : upload.mimeType;
  const inline = !options.download && INLINE_TYPES.has(type);

  const stream = await storage().get(key);
  return new Response(Readable.toWeb(stream as Readable) as ReadableStream, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", upload.originalName),
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

const STATUS: Partial<Record<DomainError["code"], number>> = {
  not_found: 404,
  locked: 409,
  rate_limited: 429,
  invalid_input: 400,
  file_type: 415,
  file_too_large: 413,
  file_empty: 400,
  too_many_files: 409,
  quota_exceeded: 413,
};

export function errorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return Response.json({ error: error.code }, { status: STATUS[error.code] ?? 400 });
  }
  console.error("[api]", error);
  return Response.json({ error: "generic" }, { status: 500 });
}
