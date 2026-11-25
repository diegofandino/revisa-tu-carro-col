import { describe, expect, it } from "bun:test";
import type { RuleEvaluation } from "@/domain/maintenance/types";
import { averageLine, dueEstimate, dueHeadline, dueLimit, statusLabel, summaryLine } from "./format-due";

const base: RuleEvaluation = {
  status: "ok",
  dueKm: null,
  dueDate: null,
  remainingKm: null,
  remainingDays: null,
  estimatedKmDate: null,
  effectiveDueDate: null,
  drivenBy: null,
  isEstimate: false,
  isApproximate: false,
};
const ev = (over: Partial<RuleEvaluation>): RuleEvaluation => ({ ...base, ...over });

describe("statusLabel", () => {
  it.each([
    { status: "overdue" as const, expected: "Vencido" },
    { status: "due_soon" as const, expected: "Próximo" },
    { status: "no_baseline" as const, expected: "Sin registro" },
    { status: "ok" as const, expected: "Al día" },
  ])("$status → $expected", ({ status, expected }) => {
    expect(statusLabel(status)).toBe(expected);
  });
});

describe("dueHeadline", () => {
  it.each([
    {
      name: "D1: km and days left",
      kind: "mechanical" as const,
      e: ev({ status: "due_soon", remainingKm: 400, remainingDays: 14 }),
      expected: "Faltan 400 km o 14 días",
    },
    { name: "km only", kind: "mechanical" as const, e: ev({ remainingKm: 4000 }), expected: "Faltan 4.000 km" },
    { name: "days only", kind: "mechanical" as const, e: ev({ remainingDays: 120 }), expected: "Faltan 120 días" },
    { name: "one day (singular)", kind: "mechanical" as const, e: ev({ remainingDays: 1 }), expected: "Falta 1 día" },
    { name: "one km (singular)", kind: "mechanical" as const, e: ev({ remainingKm: 1 }), expected: "Falta 1 km" },
    {
      name: "1 km or 1 day is plural",
      kind: "mechanical" as const,
      e: ev({ remainingKm: 1, remainingDays: 1 }),
      expected: "Faltan 1 km o 1 día",
    },
    {
      name: "due today",
      kind: "mechanical" as const,
      e: ev({ remainingKm: 300, remainingDays: 0 }),
      expected: "Vence hoy",
    },
    {
      name: "overdue by km",
      kind: "mechanical" as const,
      e: ev({ status: "overdue", remainingKm: -200, remainingDays: 40 }),
      expected: "Pasado por 200 km",
    },
    {
      name: "km reached exactly",
      kind: "mechanical" as const,
      e: ev({ status: "overdue", remainingKm: 0 }),
      expected: "Llegó al kilometraje",
    },
    {
      name: "overdue by date (singular day)",
      kind: "mechanical" as const,
      e: ev({ status: "overdue", remainingDays: -1 }),
      expected: "Venció hace 1 día",
    },
    {
      name: "overdue by km and date",
      kind: "mechanical" as const,
      e: ev({ status: "overdue", remainingKm: -1500, remainingDays: -3 }),
      expected: "Pasado por 1.500 km · Venció hace 3 días",
    },
    {
      name: "legal expired",
      kind: "legal" as const,
      e: ev({ status: "overdue", remainingDays: -3 }),
      expected: "Venció hace 3 días",
    },
    {
      name: "legal soon",
      kind: "legal" as const,
      e: ev({ status: "due_soon", remainingDays: 20 }),
      expected: "Faltan 20 días",
    },
    {
      name: "D3: mechanical without baseline",
      kind: "mechanical" as const,
      e: ev({ status: "no_baseline" }),
      expected: "¿Cuándo lo hiciste por última vez?",
    },
    {
      name: "legal without baseline",
      kind: "legal" as const,
      e: ev({ status: "no_baseline" }),
      expected: "Registra el documento con su fecha de vencimiento",
    },
    {
      name: "no data (km rule without current km)",
      kind: "mechanical" as const,
      e: ev({}),
      expected: "Sin datos para calcular",
    },
  ])("$name", ({ kind, e, expected }) => {
    expect(dueHeadline(kind, e)).toBe(expected);
  });
});

describe("dueLimit", () => {
  it.each([
    {
      name: "km and date",
      kind: "mechanical" as const,
      e: ev({ dueKm: 25000, dueDate: "2026-12-01" }),
      expected: "Toca a los 25.000 km o el 1 de dic. de 2026",
    },
    { name: "km only", kind: "mechanical" as const, e: ev({ dueKm: 50000 }), expected: "Toca a los 50.000 km" },
    {
      name: "date only",
      kind: "mechanical" as const,
      e: ev({ dueDate: "2028-06-01" }),
      expected: "Toca el 1 de jun. de 2028",
    },
    { name: "nothing known", kind: "mechanical" as const, e: ev({}), expected: null },
    {
      name: "legal future",
      kind: "legal" as const,
      e: ev({ dueDate: "2027-01-10", remainingDays: 54 }),
      expected: "Vence el 10 de ene. de 2027",
    },
    {
      name: "legal past",
      kind: "legal" as const,
      e: ev({ status: "overdue", dueDate: "2026-11-14", remainingDays: -3 }),
      expected: "Venció el 14 de nov. de 2026",
    },
    { name: "legal without date", kind: "legal" as const, e: ev({}), expected: null },
    { name: "no baseline", kind: "mechanical" as const, e: ev({ status: "no_baseline", dueKm: 1 }), expected: null },
  ])("$name", ({ kind, e, expected }) => {
    expect(dueLimit(kind, e)).toBe(expected);
  });
});

describe("dueEstimate", () => {
  it("labels a km-based date as estimated", () => {
    expect(dueEstimate(ev({ isEstimate: true, effectiveDueDate: "2026-11-25" }))).toBe(
      "Fecha estimada: ≈ 25 de nov. de 2026, según tu uso",
    );
  });

  it("returns null for calendar dates", () => {
    expect(dueEstimate(ev({ effectiveDueDate: "2026-12-01" }))).toBeNull();
    expect(dueEstimate(ev({ isEstimate: true }))).toBeNull();
  });
});

describe("averageLine", () => {
  it.each([
    { name: "no estimate (D2)", avg: null, expected: "Aún no hay suficientes lecturas para estimar fechas" },
    { name: "rounded", avg: 49.6, expected: "Usas ~50 km/día según tus lecturas" },
    { name: "thousands", avg: 1234.4, expected: "Usas ~1.234 km/día según tus lecturas" },
    { name: "under 1 km/day", avg: 0.4, expected: "Usas menos de 1 km/día según tus lecturas" },
  ])("$name", ({ avg, expected }) => {
    expect(averageLine(avg)).toBe(expected);
  });
});

describe("summaryLine", () => {
  const c = (overdue: number, due_soon: number, no_baseline: number, ok: number) => ({
    overdue,
    due_soon,
    no_baseline,
    ok,
  });
  it.each([
    { name: "plural", counts: c(2, 3, 0, 5), expected: "2 vencidos · 3 próximos" },
    { name: "singular", counts: c(1, 1, 0, 0), expected: "1 vencido · 1 próximo" },
    { name: "with no baseline", counts: c(0, 0, 2, 1), expected: "2 sin registro" },
    { name: "all fine", counts: c(0, 0, 0, 4), expected: "Todo al día" },
    { name: "no rules", counts: c(0, 0, 0, 0), expected: null },
  ])("$name", ({ counts, expected }) => {
    expect(summaryLine(counts)).toBe(expected);
  });
});
