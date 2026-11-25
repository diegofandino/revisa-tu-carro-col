import { APP_LOCALE } from "@/constants/app";
import type { MaintenanceKind, RuleEvaluation, RuleStatus } from "@/domain/maintenance/types";
import type { StatusCounts } from "@/domain/maintenance/vehicle-due";
import { formatDate, formatKm } from "./format";

const STATUS_LABEL: Record<RuleStatus, string> = {
  overdue: "Vencido",
  due_soon: "Próximo",
  no_baseline: "Sin registro",
  ok: "Al día",
};

const avgFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 0 });

const days = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export function statusLabel(status: RuleStatus): string {
  return STATUS_LABEL[status];
}

/** Main line of an item: what is left, or by how much it is late. */
export function dueHeadline(kind: MaintenanceKind, e: RuleEvaluation): string {
  if (e.status === "no_baseline") {
    return kind === "legal"
      ? "Registra el documento con su fecha de vencimiento"
      : "¿Cuándo lo hiciste por última vez?";
  }

  const late: string[] = [];
  if (e.remainingKm !== null && e.remainingKm <= 0) {
    late.push(e.remainingKm === 0 ? "Llegó al kilometraje" : `Pasado por ${formatKm(-e.remainingKm)}`);
  }
  if (e.remainingDays !== null && e.remainingDays < 0) late.push(`Venció hace ${days(-e.remainingDays)}`);
  if (late.length > 0) return late.join(" · ");

  if (e.remainingDays === 0) return "Vence hoy";
  const left = [
    e.remainingKm !== null ? formatKm(e.remainingKm) : null,
    e.remainingDays !== null ? days(e.remainingDays) : null,
  ].filter((p) => p !== null);
  if (left.length === 0) return "Sin datos para calcular";
  const verb = left.length === 1 && (e.remainingKm ?? e.remainingDays) === 1 ? "Falta" : "Faltan";
  return `${verb} ${left.join(" o ")}`;
}

/** When it is due: the km and/or calendar limit, or the document's expiry. */
export function dueLimit(kind: MaintenanceKind, e: RuleEvaluation): string | null {
  if (e.status === "no_baseline") return null;
  if (kind === "legal") {
    if (e.dueDate === null) return null;
    return `${e.remainingDays !== null && e.remainingDays < 0 ? "Venció" : "Vence"} el ${formatDate(e.dueDate)}`;
  }
  const parts = [
    e.dueKm !== null ? `a los ${formatKm(e.dueKm)}` : null,
    e.dueDate !== null ? `el ${formatDate(e.dueDate)}` : null,
  ].filter((p) => p !== null);
  return parts.length === 0 ? null : `Toca ${parts.join(" o ")}`;
}

/** Only when the effective date comes from the km average (must be labeled as an estimate). */
export function dueEstimate(e: RuleEvaluation): string | null {
  if (!e.isEstimate || e.effectiveDueDate === null) return null;
  return `Fecha estimada: ≈ ${formatDate(e.effectiveDueDate)}, según tu uso`;
}

export function averageLine(avgKmPerDay: number | null): string {
  if (avgKmPerDay === null) return "Aún no hay suficientes lecturas para estimar fechas";
  if (avgKmPerDay < 1) return "Usas menos de 1 km/día según tus lecturas";
  return `Usas ~${avgFormatter.format(Math.round(avgKmPerDay))} km/día según tus lecturas`;
}

/** "2 vencidos · 1 próximo", "Todo al día", or null when there is nothing to summarize. */
export function summaryLine(counts: StatusCounts): string | null {
  const parts = [
    counts.overdue > 0 ? `${counts.overdue} ${counts.overdue === 1 ? "vencido" : "vencidos"}` : null,
    counts.due_soon > 0 ? `${counts.due_soon} ${counts.due_soon === 1 ? "próximo" : "próximos"}` : null,
    counts.no_baseline > 0 ? `${counts.no_baseline} sin registro` : null,
  ].filter((p) => p !== null);
  if (parts.length > 0) return parts.join(" · ");
  return counts.ok > 0 ? "Todo al día" : null;
}
