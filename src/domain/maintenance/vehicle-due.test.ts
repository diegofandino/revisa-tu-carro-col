import { describe, expect, it } from "bun:test";
import type { Baseline, Rule } from "./types";
import { buildVehicleDue, countByStatus, sumCounts } from "./vehicle-due";

const today = "2026-11-17";
const OIL = "type-oil";
const TIRES = "type-tires";
const SOAT = "type-soat";
const BRAKES = "type-brakes";

const oil: Rule = { kind: "mechanical", intervalKm: 5000, intervalMonths: 6 };
const tires: Rule = { kind: "mechanical", intervalKm: 40000, intervalMonths: null };
const soat: Rule = { kind: "legal", intervalKm: null, intervalMonths: null };
const brakes: Rule = { kind: "mechanical", intervalKm: null, intervalMonths: 24 };

const rules = [
  { id: "r-tires", name: "Llantas", maintenanceTypeId: TIRES, rule: tires },
  { id: "r-oil", name: "Cambio de aceite", maintenanceTypeId: OIL, rule: oil },
  { id: "r-brakes", name: "Líquido de frenos", maintenanceTypeId: BRAKES, rule: brakes },
  { id: "r-soat", name: "SOAT", maintenanceTypeId: SOAT, rule: soat },
];

const baselines = new Map<string, Baseline>([
  [OIL, { date: "2026-06-01", km: 20000, expiresOn: null, isApproximate: false }],
  [TIRES, { date: "2025-01-01", km: 10000, expiresOn: null, isApproximate: true }],
  [SOAT, { date: "2025-11-10", km: null, expiresOn: "2026-11-10", isApproximate: false }],
]);

const readings = [
  { date: "2026-10-18", km: 23100 },
  { date: "2026-11-17", km: 24600 },
];

describe("buildVehicleDue", () => {
  const due = buildVehicleDue(rules, baselines, readings, today);

  it("derives the current km and the daily average from the readings", () => {
    expect(due.currentKm).toBe(24600);
    expect(due.avgKmPerDay).toBe(50);
  });

  it("orders overdue → due soon → no baseline → ok and keeps the caller's fields", () => {
    expect(due.items.map((i) => [i.id, i.evaluation.status])).toEqual([
      ["r-soat", "overdue"],
      ["r-oil", "due_soon"],
      ["r-brakes", "no_baseline"],
      ["r-tires", "ok"],
    ]);
    expect(due.items[1].name).toBe("Cambio de aceite");
  });

  it("D1: oil 5,000 km / 6 months, last at 20,000, now 24,600 → due soon, 400 km left, estimated date", () => {
    expect(due.items[1].evaluation).toMatchObject({
      remainingKm: 400,
      estimatedKmDate: "2026-11-25",
      isEstimate: true,
    });
  });

  it("carries the approximate flag of the baseline", () => {
    expect(due.items[3].evaluation.isApproximate).toBe(true);
  });

  it("counts by status", () => {
    expect(due.counts).toEqual({ overdue: 1, due_soon: 1, no_baseline: 1, ok: 1 });
  });

  it.each([
    { name: "no readings", readings: [], km: null, avg: null },
    { name: "one reading (D2)", readings: [{ date: today, km: 1000 }], km: 1000, avg: null },
    {
      name: "readings less than 14 days apart (D2)",
      readings: [
        { date: "2026-11-10", km: 1000 },
        { date: today, km: 1500 },
      ],
      km: 1500,
      avg: null,
    },
  ])("without enough readings there is no estimate: $name", ({ readings: rs, km, avg }) => {
    const r = buildVehicleDue(rules, baselines, rs, today);
    expect(r.currentKm).toBe(km);
    expect(r.avgKmPerDay).toBe(avg);
    for (const item of r.items) expect(item.evaluation.isEstimate).toBe(false);
  });

  it("D3: a rule without a baseline is no_baseline", () => {
    const r = buildVehicleDue([rules[1]], new Map(), readings, today);
    expect(r.items[0].evaluation.status).toBe("no_baseline");
  });

  it("returns an empty list when the vehicle has no rules", () => {
    expect(buildVehicleDue([], baselines, readings, today)).toMatchObject({
      items: [],
      counts: { overdue: 0, due_soon: 0, no_baseline: 0, ok: 0 },
    });
  });

  it("does not mutate its inputs", () => {
    const input = [...rules];
    const rs = [...readings].reverse();
    buildVehicleDue(input, baselines, rs, today);
    expect(input.map((r) => r.id)).toEqual(rules.map((r) => r.id));
    expect(rs[0].km).toBe(24600);
  });
});

describe("countByStatus / sumCounts", () => {
  it("adds counts across vehicles", () => {
    const a = countByStatus([{ status: "overdue" }, { status: "overdue" }, { status: "ok" }]);
    const b = countByStatus([{ status: "due_soon" }]);
    expect(sumCounts([a, b])).toEqual({ overdue: 2, due_soon: 1, no_baseline: 0, ok: 1 });
    expect(sumCounts([])).toEqual({ overdue: 0, due_soon: 0, no_baseline: 0, ok: 0 });
  });
});
