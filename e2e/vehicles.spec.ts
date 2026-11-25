import { devices, expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addVehicle } from "./helpers/vehicles";

// New accounts have the default limit of 1 active vehicle.

test("create a vehicle with its first reading; the free limit hides the add button", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("vehiculo"));
  await expect(page.getByText("Agrega tu primer vehículo")).toBeVisible();

  await addVehicle(page, { alias: "Mi carro", km: "45000", plate: "abc 123" });
  await expect(page).toHaveURL(/\/panel\/vehiculos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Mi carro" })).toBeVisible();
  await expect(page.getByText("45.000 km", { exact: true })).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();

  await page.goto("/panel");
  await expect(page.getByRole("link", { name: "Mi carro", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agregar vehículo" })).toHaveCount(0);
  await expect(page.getByText("Tu plan permite 1 vehículo activo")).toBeVisible();
});

test("the server enforces the vehicle limit even through the form URL", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("limite"));
  await addVehicle(page, { alias: "Primero", km: "1000" });
  await expect(page.getByRole("heading", { name: "Primero" })).toBeVisible();
  await addVehicle(page, { class: "Moto", alias: "Segundo", km: "500" });
  await expect(page.getByText("Tu plan permite 1 vehículo activo. Archiva uno o mejora tu plan.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Segundo");
});

test("archive frees the slot; unarchiving beyond the limit is rejected", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("archivar"));
  await addVehicle(page, { alias: "Viejo", km: "90000" });
  await page.getByRole("button", { name: "Archivar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByText("Agrega tu primer vehículo")).toBeVisible();

  await addVehicle(page, { class: "Moto", alias: "Nueva", km: "10" });
  await expect(page.getByRole("heading", { name: "Nueva" })).toBeVisible();

  await page.goto("/panel/vehiculos/archivados");
  await expect(page.getByRole("link", { name: "Viejo" })).toBeVisible();
  await page.getByRole("button", { name: "Desarchivar" }).click();
  await expect(page.getByText("Tu plan permite 1 vehículo activo")).toBeVisible();
});

test("edit a vehicle; plates are normalized and unique per account (archived included)", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("editar"));
  await addVehicle(page, { alias: "Carro", km: "100", plate: "XYZ987" });
  await page.getByRole("button", { name: "Archivar" }).click();
  await expect(page).toHaveURL(/\/panel$/);
  await addVehicle(page, { class: "Moto", alias: "Moto", km: "10" });

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Nombre").fill("Moto roja");
  await page.getByLabel("Placa (opcional)").fill("xyz-987");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Ya tienes un vehículo con esa placa.")).toBeVisible();

  await page.getByLabel("Placa (opcional)").fill("abc 12d");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Moto roja" })).toBeVisible();
  await expect(page.getByText("ABC12D")).toBeVisible();
  await expect(page.getByText("10 km", { exact: true })).toBeVisible(); // km is not editable from the form
});

test("the server validates vehicle data even when browser checks are bypassed", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("validar"));
  await page.goto("/panel/vehiculos/nuevo");
  await page.locator("main form").evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByLabel("Kilometraje actual").fill("45.000");
  await page.getByLabel("Año (opcional)").fill("1949");
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
  await expect(page.getByText("Escribe un nombre para el vehículo.")).toBeVisible();
  await expect(page.getByText("solo con números, sin puntos ni comas")).toBeVisible();
  await expect(page.getByText("El año debe estar entre 1950")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeFocused();
});

test("another account's vehicle is not found, and malformed ids are 404", async ({ page, browser }) => {
  await signUpAndConfirm(page, uniqueEmail("duena"));
  await addVehicle(page, { alias: "Privado", km: "1234" });
  await expect(page).toHaveURL(/\/panel\/vehiculos\/[0-9a-f-]{36}$/);
  const vehicleUrl = new URL(page.url()).pathname;

  const other = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const intruder = await other.newPage();
  await signUpAndConfirm(intruder, uniqueEmail("intruso"));
  for (const path of [vehicleUrl, `${vehicleUrl}/editar`, "/panel/vehiculos/1%20or%201=1"]) {
    await intruder.goto(path);
    await expect(intruder.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(intruder.getByText("Privado")).toHaveCount(0);
  }
  await other.close();
});

test("an account_id injected into the form is ignored (the server uses the session)", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("inyeccion"));
  await page.goto("/panel/vehiculos/nuevo");
  await page.locator("main form").evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "account_id";
    input.value = "00000000-0000-4000-8000-000000000000";
    form.append(input);
  });
  await page.getByRole("radio", { name: "Carro" }).check();
  await page.getByLabel("Nombre").fill("Mío");
  await page.getByLabel("Kilometraje actual").fill("5");
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
  await expect(page.getByRole("heading", { name: "Mío" })).toBeVisible();
  await page.goto("/panel");
  await expect(page.getByRole("link", { name: "Mío", exact: true })).toBeVisible();
});

test("archived list tolerates invalid page parameters", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("paginas"));
  for (const query of ["?pagina=abc", "?pagina=-1", "?pagina=99999999", "?pagina=1&pagina=2"]) {
    const response = await page.goto(`/panel/vehiculos/archivados${query}`);
    expect(response?.status(), query).toBe(200);
    await expect(page.getByText("No tienes vehículos archivados.")).toBeVisible();
  }
  // A page beyond the last one must not crash the server.
  const beyond = await page.goto("/panel/vehiculos/archivados?pagina=3");
  expect(beyond?.status()).toBe(200);
  await expect(page.getByText("No tienes vehículos archivados.")).toBeVisible();
});
