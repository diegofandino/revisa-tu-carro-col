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

/** "Cada 5.000 km o 6 meses (lo que ocurra primero)", or the legal-document wording. */
export function formatInterval(kind: "mechanical" | "legal", intervalKm: number | null, intervalMonths: number | null) {
  if (kind === "legal") return "Según la fecha de vencimiento del documento";
  const parts = [
    intervalKm !== null ? formatKm(intervalKm) : null,
    intervalMonths !== null ? `${intervalMonths} ${intervalMonths === 1 ? "mes" : "meses"}` : null,
  ].filter(Boolean);
  if (parts.length === 2) return `Cada ${parts[0]} o ${parts[1]} (lo que ocurra primero)`;
  return parts.length === 1 ? `Cada ${parts[0]}` : "Sin intervalo";
}
