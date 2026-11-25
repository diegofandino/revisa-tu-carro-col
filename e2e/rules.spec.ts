import { devices, expect, type Page, test } from "@playwright/test";
import { signUpAndConfirm } from "./helpers/auth";
import { uniqueEmail } from "./helpers/mailpit";
import { addVehicle } from "./helpers/vehicles";

async function newVehicleRules(page: Page, cls: "Carro" | "Moto" = "Carro") {
  await signUpAndConfirm(page, uniqueEmail("reglas"));
  await addVehicle(page, { class: cls, alias: cls, km: "1000" });
  await expect(page.getByRole("heading", { name: cls, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Mantenimientos", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Mantenimientos de ${cls}` })).toBeVisible();
}

const form = (page: Page) => page.getByRole("form", { name: "Agregar mantenimiento" });
const current = (page: Page) => page.getByRole("region", { name: "Reglas vigentes" });

async function addRule(page: Page, type: string, km?: string, months?: string) {
  await form(page).getByLabel("Mantenimiento").selectOption({ label: type });
  if (km !== undefined) await form(page).getByLabel("Cada cuántos km").fill(km);
  if (months !== undefined) await form(page).getByLabel("Cada cuántos meses").fill(months);
  await form(page).getByRole("button", { name: "Agregar mantenimiento" }).click();
}

test("add a km + months rule; the type is no longer offered", async ({ page }) => {
  await newVehicleRules(page);
  await addRule(page, "Cambio de aceite", "5.000", "6");
  await expect(page.getByText("Regla agregada: Cambio de aceite.")).toBeVisible();
  await expect(current(page).getByText("Cada 5.000 km o 6 meses (lo que ocurra primero)")).toBeVisible();
  await expect(form(page).getByRole("option", { name: "Cambio de aceite" })).toHaveCount(0);
});

test("a mechanical rule needs km or months (checked on the server)", async ({ page }) => {
  await newVehicleRules(page);
  await addRule(page, "Llantas");
  await expect(form(page).getByText("Escribe cada cuántos km, cada cuántos meses, o ambos.")).toBeVisible();
  await expect(form(page).getByLabel("Cada cuántos km")).toBeFocused();
});

test("SOAT has no interval: fields are hidden and the rule uses the expiry date", async ({ page }) => {
  await newVehicleRules(page);
  await form(page).getByLabel("Mantenimiento").selectOption({ label: "SOAT" });
  await expect(form(page).getByLabel("Cada cuántos km")).toHaveCount(0);
  await expect(form(page).getByText("no usan intervalo")).toBeVisible();
  await form(page).getByRole("button", { name: "Agregar mantenimiento" }).click();
  await expect(current(page).getByText("Según la fecha de vencimiento del documento")).toBeVisible();
});

test("a SOAT rule with an injected interval is rejected by the server", async ({ page }) => {
  await newVehicleRules(page);
  await form(page).getByLabel("Mantenimiento").selectOption({ label: "SOAT" });
  await form(page).evaluate((f) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "intervalMonths";
    input.value = "12";
    f.append(input);
  });
  await form(page).getByRole("button", { name: "Agregar mantenimiento" }).click();
  await expect(page.getByText("no usan intervalo: se recuerdan por su fecha de vencimiento").first()).toBeVisible();
  await expect(current(page).locator("p.reading-km", { hasText: "SOAT" })).toHaveCount(0);
});

test("types depend on the vehicle class", async ({ page, browser }) => {
  await newVehicleRules(page, "Carro");
  await expect(form(page).getByRole("option", { name: "Kit de arrastre" })).toHaveCount(0);

  const other = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const moto = await other.newPage();
  await newVehicleRules(moto, "Moto");
  await expect(form(moto).getByRole("option", { name: "Kit de arrastre" })).toHaveCount(1);
  await other.close();
});

test("a type for another class, injected into the select, is rejected", async ({ page, browser }) => {
  const motoContext = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const moto = await motoContext.newPage();
  await newVehicleRules(moto, "Moto");
  const chainKitId = await form(moto).getByRole("option", { name: "Kit de arrastre" }).getAttribute("value");
  await motoContext.close();

  await newVehicleRules(page, "Carro");
  await form(page)
    .getByLabel("Mantenimiento")
    .evaluate((select: HTMLSelectElement, id) => {
      const option = new Option("Kit de arrastre", id ?? "", true, true);
      select.append(option);
      select.value = id ?? "";
    }, chainKitId);
  await form(page).getByLabel("Cada cuántos km").fill("20000");
  await form(page).getByRole("button", { name: "Agregar mantenimiento" }).click();
  await expect(form(page).getByText("Ese mantenimiento no aplica para este tipo de vehículo.")).toBeVisible();
});

test("only one current rule per type (duplicate re-injected after adding)", async ({ page }) => {
  await newVehicleRules(page);
  const oilId = await form(page).getByRole("option", { name: "Cambio de aceite" }).getAttribute("value");
  await addRule(page, "Cambio de aceite", "5000");
  await expect(page.getByText("Regla agregada: Cambio de aceite.")).toBeVisible();
  await form(page)
    .getByLabel("Mantenimiento")
    .evaluate((select: HTMLSelectElement, id) => {
      select.append(new Option("Cambio de aceite", id ?? "", true, true));
      select.value = id ?? "";
    }, oilId);
  await form(page).getByLabel("Cada cuántos km").fill("6000");
  await form(page).getByRole("button", { name: "Agregar mantenimiento" }).click();
  await expect(page.getByText("Ya tienes una regla vigente para ese mantenimiento.", { exact: false })).toBeVisible();
});

test("edit intervals in the dialog; invalid values keep it open", async ({ page }) => {
  await newVehicleRules(page);
  await addRule(page, "Cambio de aceite", "5000", "6");
  await expect(current(page).getByText("Cada 5.000 km o 6 meses", { exact: false })).toBeVisible();

  await current(page).getByRole("button", { name: "Editar Cambio de aceite" }).click();
  const dialog = page.getByRole("dialog", { name: "Cambio de aceite" });
  await expect(dialog.getByLabel("Cada cuántos km")).toBeFocused();
  await dialog.getByLabel("Cada cuántos km").fill("50");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByText("El intervalo en km debe estar entre 100 y 200.000.")).toBeVisible();

  await dialog.getByLabel("Cada cuántos km").fill("10000");
  await dialog.getByLabel("Cada cuántos meses").fill("");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
  await expect(current(page).getByText("Cada 10.000 km", { exact: true })).toBeVisible();
});

test("archive a rule; the type can be configured again", async ({ page }) => {
  await newVehicleRules(page);
  await addRule(page, "Bujías", "20000");
  await expect(current(page).locator("p.reading-km", { hasText: "Bujías" })).toBeVisible();
  await current(page).getByRole("button", { name: "Archivar Bujías" }).click();
  await expect(current(page).locator("p.reading-km", { hasText: "Bujías" })).toHaveCount(0);
  await expect(form(page).getByRole("option", { name: "Bujías" })).toHaveCount(1);
  await addRule(page, "Bujías", "30000");
  await expect(current(page).getByText("Cada 30.000 km", { exact: true })).toBeVisible();
});

test("another account's rules page is not found", async ({ page, browser }) => {
  await newVehicleRules(page);
  const rulesUrl = new URL(page.url()).pathname;
  const other = await browser.newContext({ ...devices["iPhone 15"], baseURL: "http://127.0.0.1:3100" });
  const intruder = await other.newPage();
  await signUpAndConfirm(intruder, uniqueEmail("intruso-reglas"));
  await intruder.goto(rulesUrl);
  await expect(intruder.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await other.close();
});
