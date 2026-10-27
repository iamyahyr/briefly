/** Helpers for the throwaway databases used by integration and e2e tests. */
import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export function testDatabaseUrl(name: string): string {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!base) throw new Error("Set DATABASE_URL or TEST_DATABASE_URL");
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function prepareTestDatabase(name: string): Promise<string> {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Invalid database name: ${name}`);
  const target = testDatabaseUrl(name);
  const admin = new URL(target);
  admin.pathname = "/postgres";

  const adminClient = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    const exists = await adminClient`select 1 from pg_database where datname = ${name}`;
    if (!exists.length) await adminClient.unsafe(`create database "${name}"`);
  } finally {
    await adminClient.end();
  }

  const client = postgres(target, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    await client.end();
  }
  return target;
}
