/**
 * Runs once when the server starts. Applies pending database migrations so a
 * self-hosted install only needs `docker compose up`.
 * Set RUN_MIGRATIONS_ON_START=false to manage migrations yourself.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./server/db/migrate");
    await runMigrations();
  }
}
