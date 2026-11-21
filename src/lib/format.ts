import { APP_LOCALE } from "@/constants/app";

const kmFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** 45000 → "45.000 km" */
export function formatKm(km: number): string {
  return `${kmFormatter.format(km)} km`;
}

/** "2026-11-21" (calendar date) → "21 de nov. de 2026". Formatted in UTC so the day never shifts. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
