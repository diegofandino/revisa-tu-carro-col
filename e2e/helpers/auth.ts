import { expect, type Page } from "@playwright/test";
import { latestAuthLinkPath } from "./mailpit";

// Synthetic accounts on the LOCAL Supabase stack only (example.test).
export const PASSWORD = "Prueba-Local-2026";

export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/registro");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Te enviamos un correo para confirmar tu cuenta")).toBeVisible();
}

export async function signUpAndConfirm(page: Page, email: string) {
  await signUp(page, email);
  await page.goto(await latestAuthLinkPath(email, "Confirma tu correo"));
  await expect(page).toHaveURL(/\/panel$/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/ingresar$/);
}

export async function signIn(page: Page, email: string, password = PASSWORD, path = "/ingresar") {
  await page.goto(path);
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}
