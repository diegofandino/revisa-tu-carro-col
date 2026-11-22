import { devices, expect, type Page, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addVehicle } from "./helpers/vehicles";

async function newVehicleServices(page: Page, km = "1000") {
  await signUpAndConfirm(page, uniqueEmail("servicios"));
  await addVehicle(page, { alias: "Carro", km });
  await expect(page.getByRole("heading", { name: "Carro", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Servicios" }).click();
  await expect(page.getByRole("heading", { name: "Servicios de Carro" })).toBeVisible();
}

const form = (page: Page) => page.getByRole("form", { name: "Registrar servicio" });
const history = (page: Page) => page.getByRole("region", { name: "Historial de servicios" });

async function registerMechanical(
  page: Page,
  type: string,
  km: string,
  extra: { cost?: string; workshop?: string } = {},
) {
  await form(page).getByLabel("Mantenimiento").selectOption({ label: type });
  await form(page).getByLabel("Kilometraje", { exact: true }).fill(km);
  if (extra.cost) await form(page).getByLabel("Costo en pesos (opcional)").fill(extra.cost);
  if (extra.workshop) await form(page).getByLabel("Taller (opcional)").fill(extra.workshop);
  await form(page).getByRole("button", { name: "Registrar servicio" }).click();
}

test("register a mechanical service; it also becomes an odometer reading", async ({ page }) => {
  await newVehicleServices(page);
  await registerMechanical(page, "Cambio de aceite", "1.500", { cost: "150.000", workshop: "Taller Central" });
  await expect(page.getByText("Servicio registrado: Cambio de aceite.")).toBeVisible();
  const item = history(page).getByRole("listitem").filter({ hasText: "Cambio de aceite" });
  await expect(item).toContainText("1.500 km");
  await expect(item).toContainText("$ 150.000");
  await expect(item).toContainText("Taller Central");

  await page.getByRole("link", { name: "← Carro" }).click();
  await expect(page.getByText("1.500 km (", { exact: false })).toBeVisible();
  await expect(page.getByRole("region", { name: "Historial de lecturas" })).toContainText("De un servicio");
});

test("a service km that breaks the odometer history is rejected with the km", async ({ page }) => {
  await newVehicleServices(page, "1000");
  await registerMechanical(page, "Cambio de aceite", "900");
  await expect(
    page.getByText("Ese día ya tiene una lectura (1.000 km). Solo puedes registrar un valor mayor."),
  ).toBeVisible();
  await expect(history(page).getByRole("listitem")).toHaveCount(0);
});

test("SOAT asks for the expiry date instead of km", async ({ page }) => {
  await newVehicleServices(page);
  await form(page).getByLabel("Mantenimiento").selectOption({ label: "SOAT" });
  await expect(form(page).getByLabel("Kilometraje", { exact: true })).toHaveCount(0);
  await form(page).getByLabel("Fecha de vencimiento").fill("2027-06-30");
  await form(page).getByRole("button", { name: "Registrar servicio" }).click();
  await expect(page.getByText("Servicio registrado: SOAT.")).toBeVisible();
  await expect(history(page).getByRole("listitem").filter({ hasText: "SOAT" })).toContainText("vence 30 de jun");
});

test("the server requires km for mechanical and expiry for documents", async ({ page }) => {
  await newVehicleServices(page);
  await form(page).evaluate((f) => f.setAttribute("novalidate", ""));
  await form(page).getByLabel("Mantenimiento").selectOption({ label: "Llantas" });
  await form(page).getByRole("button", { name: "Registrar servicio" }).click();
  await expect(form(page).getByText("Escribe el kilometraje del vehículo cuando se hizo el servicio.")).toBeVisible();

  await form(page).getByLabel("Mantenimiento").selectOption({ label: "Revisión técnico-mecánica" });
  await form(page).getByRole("button", { name: "Registrar servicio" }).click();
  await expect(form(page).getByText("Escribe la fecha de vencimiento que aparece en el documento.")).toBeVisible();
  await expect(history(page).getByRole("listitem")).toHaveCount(0);
});

test("void a service with a reason; its reading leaves the calculations", async ({ page }) => {
  await newVehicleServices(page, "1000");
  await registerMechanical(page, "Filtro de aire", "1200");
  await expect(page.getByText("Servicio registrado: Filtro de aire.")).toBeVisible();

  await history(page)
    .getByRole("button", { name: /Anular Filtro de aire/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Anular servicio" });
  await expect(dialog.getByLabel("Motivo")).toBeFocused();
  await dialog.getByLabel("Motivo").fill("Registro equivocado");
  await dialog.getByRole("button", { name: "Anular servicio" }).click();
  await expect(dialog).toBeHidden();
  const item = history(page).getByRole("listitem").filter({ hasText: "Filtro de aire" });
  await expect(item).toContainText("(anulado)");
  await expect(item).toContainText("Anulado: Registro equivocado");
  await expect(item.getByRole("button", { name: /Anular/ })).toHaveCount(0);

  await page.getByRole("link", { name: "← Carro" }).click();
  await expect(page.getByText("1.000 km (", { exact: false })).toBeVisible();
});

test("approximate data is labeled in the history", async ({ page }) => {
  await newVehicleServices(page, "50000");
  await form(page).getByLabel("Mantenimiento").selectOption({ label: "Bujías" });
  await form(page).getByLabel("Fecha del servicio").fill("2026-01-15");
  await form(page).getByLabel("Kilometraje", { exact: true }).fill("40000");
  await form(page).getByLabel("La fecha o el kilometraje son aproximados").check();
  await form(page).getByRole("button", { name: "Registrar servicio" }).click();
  await expect(history(page).getByRole("listitem").filter({ hasText: "Bujías" })).toContainText("Datos aproximados");
});

test("a tampered service id is not found", async ({ page }) => {
  await newVehicleServices(page);
  await registerMechanical(page, "Cambio de aceite", "1100");
  await history(page)
    .getByRole("button", { name: /Anular Cambio de aceite/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Anular servicio" });
  await dialog
    .locator('input[name="serviceId"]')
    .evaluate((input: HTMLInputElement) => (input.value = "00000000-0000-4000-8000-000000000000"));
  await dialog.getByLabel("Motivo").fill("Intento manipulado");
  await dialog.getByRole("button", { name: "Anular servicio" }).click();
  await expect(dialog.getByText("No encontramos ese servicio.")).toBeVisible();
});

test("another account's services page is not found", async ({ page, browser }) => {
  await newVehicleServices(page);
  const url = new URL(page.url()).pathname;
  const other = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const intruder = await other.newPage();
  await signUpAndConfirm(intruder, uniqueEmail("intruso-servicios"));
  await intruder.goto(url);
  await expect(intruder.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await other.close();
});
