import { expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addVehicle } from "./helpers/vehicles";

// Runs on the iPhone 15 project (393 px wide): phone layout rules apply.

test("dialogs use the whole screen on a phone", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("dialogo"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await page
    .getByRole("region", { name: "Historial de lecturas" })
    .getByRole("button", { name: /Corregir/ })
    .click();

  const dialog = page.getByRole("dialog", { name: "Corregir lectura" });
  await expect(dialog).toBeVisible();
  const viewport = page.viewportSize();
  const box = await dialog.boundingBox();
  if (!viewport || !box) throw new Error("no geometry");
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(viewport.width);
  expect(box.height).toBe(viewport.height);

  // Buttons inside the dialog span its content width.
  const save = await dialog.getByRole("button", { name: "Guardar corrección" }).boundingBox();
  const cancel = await dialog.getByRole("button", { name: "Cancelar" }).boundingBox();
  expect(save?.width).toBeGreaterThan(viewport.width - 40);
  expect(cancel?.width).toBe(save?.width);
});

test("buttons in a row share the full width on a phone", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("botones"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await expect(page.getByRole("heading", { name: "Carro", exact: true })).toBeVisible();

  const links = page.getByRole("navigation", { name: "Secciones del vehículo" });
  const rules = await links.getByRole("link", { name: "Mantenimientos", exact: true }).boundingBox();
  const services = await links.getByRole("link", { name: "Servicios" }).boundingBox();
  const row = await links.boundingBox();
  if (!rules || !services || !row) throw new Error("no geometry");
  expect(rules.y).toBe(services.y); // same row
  expect(Math.abs(rules.width - services.width)).toBeLessThanOrEqual(1); // equal share
  expect(rules.x).toBe(row.x);
  expect(Math.round(services.x + services.width)).toBe(Math.round(row.x + row.width)); // reaches the edge

  // The reading's "Corregir" button spans the row on a phone.
  const correct = await page
    .getByRole("region", { name: "Historial de lecturas" })
    .getByRole("button", { name: /Corregir/ })
    .boundingBox();
  expect(correct?.width).toBeGreaterThan(row.width - 2);
});

test("buttons sharing a row have the same height", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("alturas"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await page.getByRole("link", { name: "Mantenimientos", exact: true }).click();
  const form = page.getByRole("form", { name: "Agregar mantenimiento" });
  await form.getByLabel("Mantenimiento").selectOption({ label: "Cambio de aceite" });
  await form.getByLabel("Cada cuántos km").fill("5000");
  await form.getByRole("button", { name: "Agregar mantenimiento" }).click();
  const rules = page.getByRole("region", { name: "Reglas vigentes" });
  const edit = await rules.getByRole("button", { name: /Editar/ }).boundingBox();
  const archive = await rules.getByRole("button", { name: /Archivar/ }).boundingBox();
  expect(edit?.y).toBe(archive?.y);
  expect(edit?.height).toBe(archive?.height);
  expect(edit?.height).toBeGreaterThanOrEqual(48);
});
