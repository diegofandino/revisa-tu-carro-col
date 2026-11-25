import { defineConfig, devices } from "@playwright/test";

const port = 3100;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run e2e tests with: bun run test:e2e (uses local Supabase).`);
  return value;
}

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: "iphone-webkit", use: { ...devices["iPhone 15"] } }],
  webServer: {
    // Production build so headers/CSP match what users get.
    command: `bun run build && bun run start -- -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    // Always a fresh server, so tests never run against a stale build.
    reuseExistingServer: false,
    timeout: 180_000,
    // Provided by scripts/with-local-supabase.sh (local Supabase stack only).
    env: {
      NEXT_PUBLIC_SUPABASE_URL: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    },
  },
});
