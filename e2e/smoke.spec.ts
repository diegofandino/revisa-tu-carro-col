import { expect, test } from "@playwright/test";

test("home page renders in Spanish", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Revisa Tu Carro" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-CO");
});

test("security headers are present and the framework is not advertised", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).not.toContain("unsafe-eval");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("each request gets a different CSP nonce", async ({ request }) => {
  const nonce = async () => (await request.get("/")).headers()["content-security-policy"].match(/'nonce-([^']+)'/)?.[1];
  const [a, b] = [await nonce(), await nonce()];
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
});

test("page loads every resource without CSP violations or errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || /Content Security Policy|Refused to/i.test(msg.text())) problems.push(msg.text());
  });
  page.on("requestfailed", (req) => problems.push(`failed: ${req.url()}`));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
  // Styles actually applied (catches stylesheets blocked or upgraded to an unreachable URL).
  expect(await page.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0);
});

test("CSP only upgrades insecure requests when served over HTTPS", async ({ request }) => {
  const plain = (await request.get("/")).headers()["content-security-policy"];
  expect(plain).not.toContain("upgrade-insecure-requests");
  const forwarded = await request.get("/", { headers: { "x-forwarded-proto": "https" } });
  expect(forwarded.headers()["content-security-policy"]).toContain("upgrade-insecure-requests");
});

test("web app manifest is served with icons", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ display: "standalone", lang: "es-CO", start_url: "/" });
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  }
  expect((await request.get("/apple-icon.png")).ok()).toBe(true);
});

test("declares light/dark support and follows the system color scheme", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light dark");
  await expect(page.locator('meta[name="text-scale"]')).toHaveAttribute("content", "scale");
  const surface = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  const light = await surface();
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await surface();
  expect(light).not.toBe(dark);
});

test("main content is padded for the safe area", async ({ page }) => {
  await page.goto("/");
  const padding = await page.locator("main").evaluate((el) => getComputedStyle(el).paddingTop);
  expect(Number.parseFloat(padding)).toBeGreaterThanOrEqual(16);
});
