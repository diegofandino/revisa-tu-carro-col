import { expect, type Page, test } from "@playwright/test";
import { PASSWORD } from "./helpers/auth";
import { latestAuthLinkPath, uniqueEmail } from "./helpers/mailpit";

/**
 * Guided walkthrough of the whole app, one step per screen, with a screenshot per step in
 * e2e-screenshots/walkthrough/ (git-ignored). Mirrors docs/testing/walkthrough.md so a person can
 * follow the same steps by hand. Run: bun run test:walkthrough
 */
const DIR = "e2e-screenshots/walkthrough";
let n = 0;
/** Full-page shots for screens; viewport-only shots for open dialogs (they cover the screen). */
const shot = async (page: Page, name: string, { fullPage = true } = {}) => {
  n += 1;
  await page.screenshot({ path: `${DIR}/${String(n).padStart(2, "0")}-${name}.png`, fullPage });
};

test("walkthrough: sign up → vehicle → readings → rules → services → archive → sign in", async ({ page }) => {
  test.setTimeout(120_000);
  const email = uniqueEmail("recorrido");

  await test.step("1. Home", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Revisa Tu Carro" })).toBeVisible();
    await shot(page, "inicio");
  });

  await test.step("2. Create account", async () => {
    await page.getByRole("link", { name: "Crear cuenta" }).click();
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Te enviamos un correo para confirmar tu cuenta")).toBeVisible();
    await shot(page, "registro-enviado");
  });

  await test.step("3. Confirm the email (local Mailpit) → empty dashboard", async () => {
    await page.goto(await latestAuthLinkPath(email, "Confirma tu correo"));
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
    await expect(page.getByText("Agrega tu primer vehículo")).toBeVisible();
    await shot(page, "panel-vacio");
  });

  await test.step("4. Add a car with its current km", async () => {
    await page.getByRole("link", { name: "Agregar vehículo" }).click();
    await page.getByRole("radio", { name: "Carro" }).check();
    await page.getByLabel("Nombre").fill("Carro de la casa");
    await page.getByLabel("Kilometraje actual").fill("45000");
    await page.getByLabel("Marca (opcional)").fill("Mazda");
    await page.getByLabel("Placa (opcional)").fill("abc 123");
    await shot(page, "vehiculo-formulario");
    await page.getByRole("button", { name: "Agregar vehículo" }).click();
    await expect(page.getByRole("heading", { name: "Carro de la casa" })).toBeVisible();
    await expect(page.getByText("ABC123")).toBeVisible();
    await shot(page, "vehiculo-detalle");
  });

  await test.step("5. Add a newer odometer reading", async () => {
    const form = page.getByRole("form", { name: "Agregar lectura" });
    await form.getByLabel("Kilometraje").fill("45500");
    await form.getByRole("button", { name: "Guardar lectura" }).click();
    await expect(page.getByText("Lectura guardada.")).toBeVisible();
    await expect(page.getByText("45.500 km (", { exact: false })).toBeVisible();
    await shot(page, "lectura-agregada");
  });

  await test.step("6. Correct the reading in the dialog (with a reason)", async () => {
    const history = page.getByRole("region", { name: "Historial de lecturas" });
    await history
      .getByRole("button", { name: /Corregir lectura/ })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
    await dialog.getByLabel("Kilometraje").fill("45600");
    await dialog.getByLabel("Motivo").fill("Error de digitación");
    await shot(page, "lectura-dialogo", { fullPage: false });
    await dialog.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(dialog).toBeHidden();
    await expect(history.getByText("Corregida: Error de digitación")).toBeVisible();
    await shot(page, "lectura-corregida");
  });

  await test.step("7. Configure maintenances: oil change and SOAT", async () => {
    await page.getByRole("link", { name: "Mantenimientos" }).click();
    const form = page.getByRole("form", { name: "Agregar mantenimiento" });
    await form.getByLabel("Mantenimiento").selectOption({ label: "Cambio de aceite" });
    await form.getByLabel("Cada cuántos km").fill("5.000");
    await form.getByLabel("Cada cuántos meses").fill("6");
    await form.getByRole("button", { name: "Agregar mantenimiento" }).click();
    await expect(page.getByText("Cada 5.000 km o 6 meses (lo que ocurra primero)")).toBeVisible();
    await form.getByLabel("Mantenimiento").selectOption({ label: "SOAT" });
    await form.getByRole("button", { name: "Agregar mantenimiento" }).click();
    await expect(page.getByText("Según la fecha de vencimiento del documento")).toBeVisible();
    await shot(page, "reglas");
  });

  await test.step("8. Register services: oil change and SOAT", async () => {
    await page.getByRole("link", { name: "← Carro de la casa" }).click();
    await page.getByRole("link", { name: "Servicios" }).click();
    const form = page.getByRole("form", { name: "Registrar servicio" });
    await form.getByLabel("Mantenimiento").selectOption({ label: "Cambio de aceite" });
    await form.getByLabel("Kilometraje", { exact: true }).fill("45.600");
    await form.getByLabel("Costo en pesos (opcional)").fill("150.000");
    await form.getByLabel("Taller (opcional)").fill("Taller de prueba");
    await form.getByRole("button", { name: "Registrar servicio" }).click();
    await expect(page.getByText("Servicio registrado: Cambio de aceite.")).toBeVisible();
    await form.getByLabel("Mantenimiento").selectOption({ label: "SOAT" });
    await form.getByLabel("Fecha de vencimiento").fill("2027-11-30");
    await form.getByRole("button", { name: "Registrar servicio" }).click();
    await expect(page.getByText("Servicio registrado: SOAT.")).toBeVisible();
    await shot(page, "servicios");
  });

  await test.step("9. Void a service (reason required)", async () => {
    const history = page.getByRole("region", { name: "Historial de servicios" });
    await history.getByRole("button", { name: /Anular SOAT/ }).click();
    const dialog = page.getByRole("dialog", { name: "Anular servicio" });
    await dialog.getByLabel("Motivo").fill("Registro de prueba");
    await shot(page, "anular-dialogo", { fullPage: false });
    await dialog.getByRole("button", { name: "Anular servicio" }).click();
    await expect(dialog).toBeHidden();
    await expect(history.getByText("Anulado: Registro de prueba")).toBeVisible();
    await shot(page, "servicio-anulado");
  });

  await test.step("10. Archive the vehicle and see it in archived", async () => {
    await page.getByRole("link", { name: "← Carro de la casa" }).click();
    await page.getByRole("button", { name: "Archivar" }).click();
    await expect(page).toHaveURL(/\/panel$/);
    await page.getByRole("link", { name: "Ver vehículos archivados" }).click();
    await expect(page.getByRole("link", { name: "Carro de la casa" })).toBeVisible();
    await shot(page, "archivados");
    await page.getByRole("button", { name: "Desarchivar" }).click();
    await expect(page.getByRole("heading", { name: "Carro de la casa" })).toBeVisible();
  });

  await test.step("11. Sign out and sign in again", async () => {
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("link", { name: "Carro de la casa" })).toBeVisible();
    await shot(page, "panel-final");
  });
});
