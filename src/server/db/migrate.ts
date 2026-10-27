import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export async function runMigrations() {
  if (process.env.RUN_MIGRATIONS_ON_START === "false" || !process.env.DATABASE_URL) return;

  const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } catch (error) {
    console.error("[briefly] Database migration failed", error);
    throw error;
  } finally {
    await client.end();
  }
}
