import { execFileSync } from "node:child_process";

/** After the e2e run, remove the synthetic *@example.test users from the LOCAL Supabase stack. */
export default function globalTeardown() {
  if (process.env.E2E_KEEP_TEST_USERS === "1") return;
  const output = execFileSync("supabase/tests/scripts/cleanup-test-users.sh", { encoding: "utf8" });
  console.log(output.trim());
}
