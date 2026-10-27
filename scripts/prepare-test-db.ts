/**
 * Creates (if needed) and migrates a test database.
 * Usage: tsx scripts/prepare-test-db.ts [database-name]
 */
import { prepareTestDatabase } from "../tests/support/test-db";

const name = process.argv[2] ?? "briefly_test";
prepareTestDatabase(name)
  .then(() => console.log(`Test database ready: ${name}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
