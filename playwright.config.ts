import { defineConfig, devices } from "@playwright/test";
import { testDatabaseUrl } from "./tests/support/test-db";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build with its own database
 * (`briefly_e2e`), created by `pnpm test:e2e` before Playwright starts.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", locale: "en-US" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: testDatabaseUrl("briefly_e2e"),
      APP_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-1234",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_PATH: "./data/e2e-uploads",
      DISABLE_RATE_LIMIT: "true",
    },
  },
});
