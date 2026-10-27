import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import "dotenv/config";
import { testDatabaseUrl } from "../support/test-db";

// Must run before any module calls env(), which caches the values.
process.env.DATABASE_URL = testDatabaseUrl("briefly_test");
process.env.BETTER_AUTH_SECRET = "integration-test-secret-0123456789abcdef";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_PATH = mkdtempSync(path.join(os.tmpdir(), "briefly-test-"));
process.env.UPLOAD_MAX_FILE_MB = "1";
process.env.UPLOAD_MAX_BRIEF_MB = "2";
