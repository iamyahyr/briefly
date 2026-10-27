import { prepareTestDatabase } from "../support/test-db";

export default async function setup() {
  await prepareTestDatabase("briefly_test");
}
