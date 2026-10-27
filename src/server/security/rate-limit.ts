import "server-only";
import { headers } from "next/headers";

/**
 * Small in-memory fixed-window limiter for the public questionnaire endpoints.
 * Good enough for a single self-hosted instance; put a reverse-proxy limiter in
 * front if you run several replicas.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export const LIMITS = {
  save: { max: 120, windowMs: 60_000 },
  upload: { max: 30, windowMs: 60_000 },
  submit: { max: 10, windowMs: 60_000 },
  view: { max: 60, windowMs: 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

export function hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Returns false when the caller exceeded the limit. */
export async function checkRateLimit(name: LimitName, scope: string): Promise<boolean> {
  if (process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true") return true;
  const { max, windowMs } = LIMITS[name];
  return hit(`${name}:${scope}:${await clientIp()}`, max, windowMs);
}
