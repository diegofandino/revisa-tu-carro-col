import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
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
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Fictitious values: the smoke tests do not talk to Supabase.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_EXAMPLE_NOT_A_REAL_KEY_000000",
    },
  },
});
