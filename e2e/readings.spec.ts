import { expect, type Page, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addVehicle } from "./helpers/vehicles";

async function newVehicle(page: Page, km: string) {
  await signUpAndConfirm(page, uniqueEmail("lecturas"));
  await addVehicle(page, { alias: "Carro", km });
  await expect(page.getByRole("heading", { name: "Carro" })).toBeVisible();
}

async function addReading(page: Page, km: string, date?: string) {
  const form = page.getByRole("form", { name: "Agregar lectura" });
  if (date) await form.getByLabel("Fecha").fill(date);
  await form.getByLabel("Kilometraje").fill(km);
  await form.getByRole("button", { name: "Guardar lectura" }).click();
}

const history = (page: Page) => page.getByRole("region", { name: "Historial de lecturas" });

test("a higher reading today replaces the earlier one; a lower one is rejected with the km", async ({ page }) => {
  await newVehicle(page, "1000");
  await addReading(page, "1500");
  await expect(page.getByText("Lectura guardada.")).toBeVisible();
  await expect(history(page).getByText("1.500 km", { exact: true })).toBeVisible();
  await expect(history(page).getByText("1.000 km", { exact: true })).toHaveCount(0);

  await addReading(page, "1400");
  await expect(
    page.getByText("Ese día ya tiene una lectura (1.500 km). Solo puedes registrar un valor mayor."),
  ).toBeVisible();
});

test("past readings must keep the history in order", async ({ page }) => {
  await newVehicle(page, "1500");
  await addReading(page, "500", "2026-01-01");
  await expect(page.getByText("Lectura guardada.")).toBeVisible();

  await addReading(page, "400", "2026-01-02");
  await expect(page.getByText("menor que el de una lectura anterior (500 km)")).toBeVisible();

  await addReading(page, "2000", "2026-01-02");
  await expect(page.getByText("mayor que el de una lectura posterior (1.500 km)")).toBeVisible();
});

test("correct a reading in the dialog; the reason stays in the history", async ({ page }) => {
  await newVehicle(page, "1500");
  await addReading(page, "500", "2026-01-01");
  await expect(page.getByText("Lectura guardada.")).toBeVisible();

  await history(page)
    .getByRole("button", { name: /Corregir lectura del 1 de ene/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Kilometraje")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await history(page)
    .getByRole("button", { name: /Corregir lectura del 1 de ene/ })
    .click();
  await dialog.getByLabel("Kilometraje").fill("600");
  await dialog.getByLabel("Motivo").fill("Error de digitación");
  await dialog.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(dialog).toBeHidden();
  await expect(history(page).getByText("600 km", { exact: true })).toBeVisible();
  await expect(history(page).getByText("Corregida: Error de digitación")).toBeVisible();
});

test("a correction that breaks the order is rejected inside the dialog", async ({ page }) => {
  await newVehicle(page, "1500");
  await addReading(page, "500", "2026-01-01");
  await history(page)
    .getByRole("button", { name: /Corregir lectura del 1 de ene/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await dialog.getByLabel("Kilometraje").fill("9000");
  await dialog.getByLabel("Motivo").fill("Prueba de orden");
  await dialog.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(dialog.getByText("mayor que el de una lectura posterior (1.500 km)")).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("delete a reading with a reason; the only reading cannot be deleted", async ({ page }) => {
  await newVehicle(page, "1500");
  await addReading(page, "500", "2026-01-01");
  await history(page)
    .getByRole("button", { name: /Corregir lectura del 1 de ene/ })
    .click();
  let dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await dialog.getByLabel("Motivo").fill("Lectura duplicada");
  await dialog.getByRole("button", { name: "Eliminar lectura" }).click();
  await expect(dialog).toBeHidden();
  await expect(history(page).getByText("500 km", { exact: true })).toHaveCount(0);

  await history(page)
    .getByRole("button", { name: /Corregir lectura/ })
    .click();
  dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await dialog.getByLabel("Motivo").fill("Quiero borrarla");
  await dialog.getByRole("button", { name: "Eliminar lectura" }).click();
  await expect(dialog.getByText("No puedes eliminar la única lectura del vehículo.")).toBeVisible();
});

test("the server validates readings even when browser checks are bypassed", async ({ page }) => {
  await newVehicle(page, "1000");
  const form = page.getByRole("form", { name: "Agregar lectura" });
  await form.evaluate((f) => f.setAttribute("novalidate", ""));
  await form.getByLabel("Fecha").fill("2099-01-01");
  await form.getByLabel("Kilometraje").fill("1.200");
  await form.getByRole("button", { name: "Guardar lectura" }).click();
  await expect(form.getByText("La fecha no puede ser futura.")).toBeVisible();
  await expect(form.getByText("solo con números, sin puntos ni comas")).toBeVisible();
});

test("a tampered reading id is not found (cannot touch other readings)", async ({ page }) => {
  await newVehicle(page, "1500");
  await addReading(page, "500", "2026-01-01");
  await history(page)
    .getByRole("button", { name: /Corregir lectura del 1 de ene/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await dialog
    .locator('input[name="readingId"]')
    .evaluate((input: HTMLInputElement) => (input.value = "00000000-0000-4000-8000-000000000000"));
  await dialog.getByLabel("Motivo").fill("Intento manipulado");
  await dialog.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(dialog.getByText("No encontramos esa lectura.")).toBeVisible();
});

test("the current km is the highest active reading, ignoring deleted ones", async ({ page }) => {
  await newVehicle(page, "1000");
  await addReading(page, "500", "2026-01-01");
  await expect(history(page).getByText("500 km", { exact: true })).toBeVisible();
  await addReading(page, "1500");
  await expect(page.getByText("1.500 km (", { exact: false })).toBeVisible();

  // Delete today's 1,500 reading: the current km falls back to the 500 km reading.
  await history(page)
    .getByRole("button", { name: /Corregir lectura del/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await dialog.getByLabel("Motivo").fill("Lectura equivocada");
  await dialog.getByRole("button", { name: "Eliminar lectura" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("500 km (1 de ene", { exact: false })).toBeVisible();

  await page.goto("/panel");
  await expect(page.getByRole("listitem").filter({ hasText: "Carro" })).toContainText("500 km · 1 de ene de 2026");
});
