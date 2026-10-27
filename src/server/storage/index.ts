import "server-only";
import type { Readable } from "node:stream";
import { env } from "@/server/env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}

let driver: StorageDriver | undefined;

export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  driver =
    e.STORAGE_DRIVER === "s3"
      ? new S3Storage({
          endpoint: e.S3_ENDPOINT,
          region: e.S3_REGION,
          bucket: e.S3_BUCKET!,
          accessKeyId: e.S3_ACCESS_KEY_ID!,
          secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
          forcePathStyle: e.S3_FORCE_PATH_STYLE,
        })
      : new LocalStorage(e.STORAGE_LOCAL_PATH);
  return driver;
}

/** Deletes objects, ignoring individual failures (best effort cleanup). */
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  await Promise.allSettled(keys.filter((k): k is string => !!k).map((k) => storage().delete(k)));
}
