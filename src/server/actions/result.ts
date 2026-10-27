import "server-only";
import { unstable_rethrow } from "next/navigation";
import { DomainError, type DomainErrorCode } from "@/server/dal/errors";

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: DomainErrorCode | "generic" };

/**
 * Wraps a server action body: expected domain errors become a typed result the
 * UI can translate; anything else is logged and reported as "generic".
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DomainError) return { ok: false, error: error.code };
    console.error("[action]", error);
    return { ok: false, error: "generic" };
  }
}
