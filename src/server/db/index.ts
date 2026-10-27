import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(env().DATABASE_URL, { max: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Reuse the connection pool across hot reloads in development, and create it
// lazily so importing this module never requires env vars at build time.
const globalForDb = globalThis as unknown as { db?: Database };

function getDb(): Database {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}

export const db: Database = new Proxy({} as Database, {
  get(_, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
