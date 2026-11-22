import type { Page } from "@playwright/test";

export async function addVehicle(
  page: Page,
  v: { class?: "Carro" | "Moto"; alias: string; km: string; plate?: string },
) {
  await page.goto("/panel/vehiculos/nuevo");
  await page.getByRole("radio", { name: v.class ?? "Carro" }).check();
  await page.getByLabel("Nombre").fill(v.alias);
  await page.getByLabel("Kilometraje actual").fill(v.km);
  if (v.plate) await page.getByLabel("Placa (opcional)").fill(v.plate);
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
}
