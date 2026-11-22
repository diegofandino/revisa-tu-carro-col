import { expect, test } from "@playwright/test";
import { PASSWORD, signIn, signOut, signUp, signUpAndConfirm } from "./helpers/auth";
import { latestAuthLinkPath, uniqueEmail } from "./helpers/mailpit";

test("guests are sent from the dashboard to sign-in", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/ingresar\?next=%2Fpanel$/);
  await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
});

test("sign up, confirm by email, sign out and sign in again", async ({ page }) => {
  const email = uniqueEmail("flujo");
  await signUpAndConfirm(page, email);
  await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();

  await signOut(page);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/ingresar/);

  await signIn(page, email, "Contraseña-Equivocada-1");
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await expect(page.getByLabel("Correo")).toHaveValue(email);

  await signIn(page, email);
  await expect(page).toHaveURL(/\/panel$/);
});

test("unknown accounts get the same generic error as wrong passwords", async ({ page }) => {
  await signIn(page, uniqueEmail("noexiste"), "Cualquier-Clave-1");
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("unconfirmed accounts cannot sign in", async ({ page }) => {
  const email = uniqueEmail("sinconfirmar");
  await signUp(page, email);
  await signIn(page, email);
  await expect(page.getByText("Confirma tu correo antes de ingresar")).toBeVisible();
  await expect(page).toHaveURL(/\/ingresar/);
});

test("signing up an existing email does not reveal that it exists", async ({ page }) => {
  const email = uniqueEmail("duplicado");
  await signUpAndConfirm(page, email);
  await signOut(page);
  await signUp(page, email); // same success message as a new account
});

test("sign-in ignores external redirect targets", async ({ page }) => {
  const email = uniqueEmail("redirect");
  await signUpAndConfirm(page, email);
  await signOut(page);
  await signIn(page, email, PASSWORD, `/ingresar?next=${encodeURIComponent("https://evil.example/robar")}`);
  await expect(page).toHaveURL(/127\.0\.0\.1:3100\/panel$/);
});

test("signed-in users are sent from sign-in to the dashboard", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("sesion"));
  await page.goto("/ingresar");
  await expect(page).toHaveURL(/\/panel$/);
});

test("password recovery by email sets a new password", async ({ page }) => {
  const email = uniqueEmail("recuperar");
  await signUpAndConfirm(page, email);
  await signOut(page);

  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Si existe una cuenta con ese correo")).toBeVisible();

  await page.goto(await latestAuthLinkPath(email, "Restablece tu contraseña"));
  await expect(page).toHaveURL(/\/restablecer$/);
  await page.getByLabel("Nueva contraseña").fill("Nueva-Clave-2026");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page).toHaveURL(/\/panel$/);

  await signOut(page);
  await signIn(page, email, "Nueva-Clave-2026");
  await expect(page).toHaveURL(/\/panel$/);
});

test("recovery answers the same for unknown emails", async ({ page }) => {
  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill(uniqueEmail("desconocido"));
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Si existe una cuenta con ese correo")).toBeVisible();
});

test("invalid or tampered email links show a safe error", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=manipulado&type=email&next=https://evil.example");
  await expect(page).toHaveURL(/\/ingresar\?error=enlace$/);
  await expect(page.getByText("El enlace no es válido o ya expiró")).toBeVisible();
});

test("the reset page requires a recovery session", async ({ page }) => {
  await page.goto("/restablecer");
  await expect(page).toHaveURL(/\/recuperar$/);
});

test("the server validates even when browser checks are bypassed", async ({ page }) => {
  await page.goto("/registro");
  await page.getByLabel("Correo").fill(uniqueEmail("corta"));
  const password = page.getByLabel("Contraseña", { exact: true });
  await password.fill("123");
  await page.locator("form").evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeVisible();
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toBeFocused();
});

test("the password can be shown and hidden", async ({ page }) => {
  await page.goto("/ingresar");
  const password = page.getByLabel("Contraseña", { exact: true });
  const toggle = page.getByRole("button", { name: "Mostrar" });
  await expect(password).toHaveAttribute("type", "password");
  await toggle.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar" })).toHaveAttribute("aria-pressed", "true");
});

test("auth pages load without CSP violations or errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(msg.text());
  });
  page.on("requestfailed", (req) => problems.push(`failed: ${req.url()}`));
  for (const path of ["/ingresar", "/registro", "/recuperar"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(problems).toEqual([]);
});

test("the session cookie is HttpOnly and not readable by JavaScript", async ({ page, context }) => {
  await signUpAndConfirm(page, uniqueEmail("cookie"));
  const session = (await context.cookies()).filter((c) => /^sb-.+-auth-token/.test(c.name));
  expect(session.length).toBeGreaterThan(0);
  for (const cookie of session) {
    expect(cookie.httpOnly, cookie.name).toBe(true);
    expect(cookie.sameSite, cookie.name).toBe("Lax");
  }
  expect(await page.evaluate(() => document.cookie)).not.toContain("auth-token");

  // The session still works across navigations (refreshed server-side by the proxy).
  await page.goto("/panel");
  await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
});
