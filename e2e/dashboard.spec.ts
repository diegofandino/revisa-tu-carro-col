import { devices, expect, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addRule, addService, bogotaDate, dueItem } from "./helpers/maintenance";
import { addVehicle } from "./helpers/vehicles";

// Upcoming maintenances (task 010). Dates are relative to today in Bogota.

test("without rules the vehicle page asks to configure maintenances", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-vacio"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  const section = page.getByRole("region", { name: "Próximos mantenimientos" });
  await section.getByRole("link", { name: "Configura sus mantenimientos" }).click();
  await expect(page.getByRole("form", { name: "Agregar mantenimiento" })).toBeVisible();
  await page.goto("/panel");
  await expect(page.getByText("Sin mantenimientos configurados")).toBeVisible();
});

test("D1 + D2: 400 km left is due soon; one day of readings gives no estimated date", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-d1"));
  await addVehicle(page, { alias: "Carro", km: "20000" });
  await addRule(page, "Carro", "Cambio de aceite", "5000", "6");
  await addService(page, "Carro", { type: "Cambio de aceite", date: bogotaDate(), km: "20000" });

  const reading = page.getByRole("form", { name: "Agregar lectura" });
  await reading.getByLabel("Kilometraje").fill("24600");
  await reading.getByRole("button", { name: "Guardar lectura" }).click();
  await expect(page.getByText("Lectura guardada.")).toBeVisible();

  const oil = dueItem(page, "Cambio de aceite");
  await expect(oil).toContainText("Próximo");
  await expect(oil).toContainText(/Faltan 400 km o \d+ días/);
  await expect(oil).toContainText("Toca a los 25.000 km o el");
  await expect(oil).not.toContainText("Fecha estimada");
  await expect(page.getByText("Aún no hay suficientes lecturas para estimar fechas")).toBeVisible();
});

test("D3: a rule without a service links to Servicios with the type pre-selected", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-d3"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await addRule(page, "Carro", "SOAT");

  const soat = dueItem(page, "SOAT");
  await expect(soat).toContainText("Sin registro");
  await expect(soat).toContainText("Registra el documento con su fecha de vencimiento");
  await soat.getByRole("link", { name: "Registrar servicio de SOAT" }).click();

  const form = page.getByRole("form", { name: "Registrar servicio" });
  await expect(form.getByLabel("Mantenimiento")).toHaveValue(/^[0-9a-f-]{36}$/);
  await expect(form.getByLabel("Mantenimiento").locator("option:checked")).toHaveText("SOAT");
  await expect(form.getByLabel("Fecha de vencimiento")).toBeVisible();
});

test("an invalid or foreign pre-selected type is ignored", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-tipo"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await page.getByRole("link", { name: "Servicios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Servicios de Carro" })).toBeVisible();
  const url = page.url();
  for (const tipo of ["aceite", "00000000-0000-4000-8000-000000000000", "'%20or%201=1"]) {
    await page.goto(`${url}?tipo=${tipo}`);
    await expect(page.getByRole("form", { name: "Registrar servicio" }).getByLabel("Mantenimiento")).toHaveValue("");
  }
});

test("legal documents: expired is overdue, expiring within 30 days is due soon; /panel sums them", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-legal"));
  await addVehicle(page, { alias: "Carro", km: "1000" });
  await addRule(page, "Carro", "SOAT");
  await addRule(page, "Carro", "Revisión técnico-mecánica");
  await addService(page, "Carro", { type: "SOAT", date: bogotaDate(-400), expiresOn: bogotaDate(-35) });
  await addService(page, "Carro", { type: "Revisión técnico-mecánica", date: bogotaDate(), expiresOn: bogotaDate(10) });

  const soat = dueItem(page, "SOAT");
  await expect(soat).toContainText("Vencido");
  await expect(soat).toContainText("Venció hace 35 días");
  await expect(soat).toContainText("Venció el");
  const rtm = dueItem(page, "Revisión técnico-mecánica");
  await expect(rtm).toContainText("Próximo");
  await expect(rtm).toContainText("Faltan 10 días");

  // Order: overdue first.
  const names = page.getByRole("region", { name: "Próximos mantenimientos" }).getByRole("heading", { level: 3 });
  await expect(names).toHaveText(["SOAT", "Revisión técnico-mecánica"]);
  await page.getByRole("region", { name: "Próximos mantenimientos" }).screenshot({
    path: "e2e-screenshots/dashboard/vencido-proximo.png",
  });

  await page.getByRole("link", { name: "← Volver" }).click();
  await expect(page.getByText("1 vencido · 1 próximo")).toBeVisible();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Carro" }) });
  await expect(card).toContainText("SOAT: Venció hace 35 días");
  await expect(card).toContainText("Revisión técnico-mecánica: Faltan 10 días");
  await page.screenshot({ path: "e2e-screenshots/dashboard/panel-resumen.png" });
  await card.getByRole("link", { name: "Ver todo de Carro" }).click();
  await expect(page.getByRole("heading", { name: "Carro", exact: true, level: 1 })).toBeVisible();
});

test("estimated date from the average; voiding the latest service falls back to the previous one", async ({ page }) => {
  await signUpAndConfirm(page, uniqueEmail("tablero-anular"));
  await addVehicle(page, { alias: "Carro", km: "7000" });
  await addRule(page, "Carro", "Cambio de aceite", "5000", "6");
  await addService(page, "Carro", { type: "Cambio de aceite", date: bogotaDate(-100), km: "1000" });
  await addService(page, "Carro", { type: "Cambio de aceite", date: bogotaDate(-10), km: "6500" });

  // Readings 1,000 (−100 d) → 7,000 (today): ~60 km/day over the whole history.
  await expect(page.getByText("Usas ~60 km/día según tus lecturas")).toBeVisible();
  const oil = dueItem(page, "Cambio de aceite");
  await expect(oil).toContainText("Al día");
  await expect(oil).toContainText("Faltan 4.500 km");
  await expect(oil).toContainText("Fecha estimada: ≈");

  await page.getByRole("link", { name: "Servicios", exact: true }).click();
  const history = page.getByRole("region", { name: "Historial de servicios" });
  await history
    .getByRole("button", { name: /Anular Cambio de aceite/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Anular servicio" });
  await dialog.getByLabel("Motivo").fill("Registro equivocado");
  await dialog.getByRole("button", { name: "Anular servicio" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("link", { name: "← Carro" }).click();

  await expect(oil).toContainText("Vencido");
  await expect(oil).toContainText("Pasado por 1.000 km");
});

test("another account's vehicle never shows its maintenances", async ({ page: owner, browser }) => {
  await signUpAndConfirm(owner, uniqueEmail("tablero-dueno"));
  await addVehicle(owner, { alias: "Privado", km: "1000" });
  await addRule(owner, "Privado", "SOAT");
  const vehicleUrl = new URL(owner.url()).pathname;

  const other = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const intruder = await other.newPage();
  await signUpAndConfirm(intruder, uniqueEmail("tablero-intruso"));
  await expect(intruder.getByText("SOAT")).toHaveCount(0);
  await intruder.goto(vehicleUrl);
  await expect(intruder.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await expect(intruder.getByText("SOAT")).toHaveCount(0);
  await other.close();
});
