import { fileTypeFromBuffer } from "file-type";
import type { FileKind } from "@/templates/types";

/** Allowed formats per kind. The real type is detected from the bytes, never the extension. */
export const KIND_MIME_TYPES: Record<FileKind, Record<string, string>> = {
  image: {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  },
  svg: { "image/svg+xml": "svg" },
  pdf: { "application/pdf": "pdf" },
};

export const RASTER_IMAGE_TYPES = new Set(Object.keys(KIND_MIME_TYPES.image));

export type FileCheck =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: "file_type" | "file_too_large" | "file_empty" };

function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 4096).toString("utf8").replace(/^﻿/, "");
  // Optional XML declaration, comments and doctype before the root <svg> element.
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
    head,
  );
}

export async function checkFile(buffer: Buffer, accept: FileKind[], maxBytes: number): Promise<FileCheck> {
  if (buffer.length === 0) return { ok: false, error: "file_empty" };
  if (buffer.length > maxBytes) return { ok: false, error: "file_too_large" };

  const allowed: Record<string, string> = Object.assign({}, ...accept.map((k) => KIND_MIME_TYPES[k]));

  const detected = await fileTypeFromBuffer(buffer);
  // SVG is XML text: file-type reports it as generic XML (with a prolog) or not at all.
  if ((!detected || detected.mime === "application/xml") && accept.includes("svg") && looksLikeSvg(buffer)) {
    return { ok: true, mime: "image/svg+xml", ext: "svg" };
  }
  if (detected) {
    const ext = allowed[detected.mime];
    return ext ? { ok: true, mime: detected.mime, ext } : { ok: false, error: "file_type" };
  }
  return { ok: false, error: "file_type" };
}

/** Value for the `accept` attribute of <input type="file">. */
export function acceptAttribute(accept: FileKind[]): string {
  const ext: Record<FileKind, string[]> = {
    image: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"],
    svg: [".svg"],
    pdf: [".pdf"],
  };
  return accept.flatMap((k) => [...Object.keys(KIND_MIME_TYPES[k]), ...ext[k]]).join(",");
}
