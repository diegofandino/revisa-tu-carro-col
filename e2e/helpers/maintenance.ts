import { expect, type Page } from "@playwright/test";

/** Calendar date in Bogota, `days` from today (negative = past), as YYYY-MM-DD. */
export function bogotaDate(days = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Adds a rule from the vehicle page; returns to the vehicle page. */
export async function addRule(page: Page, vehicleAlias: string, type: string, km?: string, months?: string) {
  await page.getByRole("link", { name: "Mantenimientos", exact: true }).click();
  const form = page.getByRole("form", { name: "Agregar mantenimiento" });
  await form.getByLabel("Mantenimiento").selectOption({ label: type });
  if (km) await form.getByLabel("Cada cuántos km").fill(km);
  if (months) await form.getByLabel("Cada cuántos meses").fill(months);
  await form.getByRole("button", { name: "Agregar mantenimiento" }).click();
  await expect(
    page.getByRole("region", { name: "Reglas vigentes" }).getByText(type, { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: `← ${vehicleAlias}` }).click();
}

/** Registers a service from the vehicle page; returns to the vehicle page. */
export async function addService(
  page: Page,
  vehicleAlias: string,
  s: { type: string; date: string; km?: string; expiresOn?: string },
) {
  await page.getByRole("link", { name: "Servicios", exact: true }).click();
  const form = page.getByRole("form", { name: "Registrar servicio" });
  await form.getByLabel("Mantenimiento").selectOption({ label: s.type });
  await form.getByLabel(/^Fecha (del servicio|de expedición)/).fill(s.date);
  if (s.km) await form.getByLabel("Kilometraje", { exact: true }).fill(s.km);
  if (s.expiresOn) await form.getByLabel("Fecha de vencimiento").fill(s.expiresOn);
  await form.getByRole("button", { name: "Registrar servicio" }).click();
  await expect(page.getByText(`Servicio registrado: ${s.type}.`)).toBeVisible();
  await page.getByRole("link", { name: `← ${vehicleAlias}` }).click();
}

/** One maintenance of the "Próximos mantenimientos" section on the vehicle page. */
export function dueItem(page: Page, name: string) {
  return page
    .getByRole("region", { name: "Próximos mantenimientos" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}
