import { describe, expect, it } from "bun:test";
import { compareEvaluations, evaluateRule } from "./evaluate-rule";
import type { Baseline, Rule, RuleEvaluation } from "./types";

const today = "2026-11-17";
const oil: Rule = { kind: "mechanical", intervalKm: 5000, intervalMonths: 6 };
const baseline: Baseline = { date: "2026-06-01", km: 20000, expiresOn: null, isApproximate: false };

describe("evaluateRule — mechanical", () => {
  it("D1: 400 km left (≤10%) is due soon; due date is 6 months later", () => {
    const r = evaluateRule({ rule: oil, baseline, currentKm: 24600, avgKmPerDay: null, today });
    expect(r).toMatchObject({
      status: "due_soon",
      dueKm: 25000,
      remainingKm: 400,
      dueDate: "2026-12-01",
      remainingDays: 14,
      effectiveDueDate: "2026-12-01",
      drivenBy: "time",
      isEstimate: false,
    });
  });

  it("estimates the km date from the daily average and picks whichever comes first", () => {
    const r = evaluateRule({ rule: oil, baseline, currentKm: 24600, avgKmPerDay: 50, today });
    expect(r.estimatedKmDate).toBe("2026-11-25"); // 400 km / 50 km per day = 8 days
    expect(r.effectiveDueDate).toBe("2026-11-25");
    expect(r.drivenBy).toBe("km");
    expect(r.isEstimate).toBe(true);
  });

  it("keeps the time threshold when it comes before the km estimate", () => {
    const r = evaluateRule({ rule: oil, baseline, currentKm: 21000, avgKmPerDay: 10, today });
    expect(r.estimatedKmDate).toBe("2027-12-22"); // 4,000 km / 10 km per day = 400 days
    expect(r.effectiveDueDate).toBe("2026-12-01");
    expect(r.drivenBy).toBe("time");
  });

  it("rounds the estimated days up (never earlier than reality)", () => {
    const r = evaluateRule({ rule: oil, baseline, currentKm: 24600, avgKmPerDay: 150, today });
    expect(r.estimatedKmDate).toBe("2026-11-20"); // 2.67 days -> 3
  });

  it("D2: without an average there is no km estimate", () => {
    const rule: Rule = { kind: "mechanical", intervalKm: 5000, intervalMonths: null };
    const r = evaluateRule({ rule, baseline, currentKm: 21000, avgKmPerDay: null, today });
    expect(r).toMatchObject({ status: "ok", remainingKm: 4000, estimatedKmDate: null, effectiveDueDate: null });
    expect(r.drivenBy).toBe("km");
    expect(r.isEstimate).toBe(false);
  });

  it("ignores a zero average", () => {
    const r = evaluateRule({ rule: oil, baseline, currentKm: 21000, avgKmPerDay: 0, today });
    expect(r.estimatedKmDate).toBeNull();
  });

  it("is overdue when the km is reached (exactly 0 left counts)", () => {
    expect(evaluateRule({ rule: oil, baseline, currentKm: 25000, avgKmPerDay: 50, today })).toMatchObject({
      status: "overdue",
      remainingKm: 0,
      estimatedKmDate: null,
    });
  });

  it("is overdue one day after the due date, due soon on the due date", () => {
    const old: Baseline = { ...baseline, date: "2026-05-16" }; // due 2026-11-16
    expect(evaluateRule({ rule: oil, baseline: old, currentKm: 21000, avgKmPerDay: null, today }).status).toBe(
      "overdue",
    );
    const dueToday: Baseline = { ...baseline, date: "2026-05-17" };
    const r = evaluateRule({ rule: oil, baseline: dueToday, currentKm: 21000, avgKmPerDay: null, today });
    expect(r.remainingDays).toBe(0);
    expect(r.status).toBe("due_soon");
  });

  it("30 days left is due soon, 31 is ok", () => {
    const rule: Rule = { kind: "mechanical", intervalKm: null, intervalMonths: 2 };
    // Due 2026-12-18 → 31 days from 2026-11-17.
    const r31 = evaluateRule({
      rule,
      baseline: { ...baseline, date: "2026-10-18" },
      currentKm: 0,
      avgKmPerDay: null,
      today,
    });
    expect(r31.remainingDays).toBe(31);
    expect(r31.status).toBe("ok");
    // Due 2026-12-17 → 30 days.
    const r30 = evaluateRule({
      rule,
      baseline: { ...baseline, date: "2026-10-17" },
      currentKm: 0,
      avgKmPerDay: null,
      today,
    });
    expect(r30.remainingDays).toBe(30);
    expect(r30.status).toBe("due_soon");
  });

  it("500 km left on a 5,000 km interval is due soon, 501 is ok", () => {
    const rule: Rule = { kind: "mechanical", intervalKm: 5000, intervalMonths: null };
    expect(evaluateRule({ rule, baseline, currentKm: 24500, avgKmPerDay: null, today }).status).toBe("due_soon");
    expect(evaluateRule({ rule, baseline, currentKm: 24499, avgKmPerDay: null, today }).status).toBe("ok");
  });

  it("D3: without a baseline the status is no_baseline", () => {
    expect(evaluateRule({ rule: oil, baseline: null, currentKm: 1000, avgKmPerDay: 10, today })).toMatchObject({
      status: "no_baseline",
      dueKm: null,
      effectiveDueDate: null,
    });
  });

  it("carries the approximate flag of the baseline", () => {
    const approx = { ...baseline, isApproximate: true };
    expect(
      evaluateRule({ rule: oil, baseline: approx, currentKm: 21000, avgKmPerDay: null, today }).isApproximate,
    ).toBe(true);
  });

  it("handles a time-only rule without km data", () => {
    const rule: Rule = { kind: "mechanical", intervalKm: null, intervalMonths: 24 };
    const r = evaluateRule({ rule, baseline: { ...baseline, km: null }, currentKm: null, avgKmPerDay: null, today });
    expect(r).toMatchObject({ dueKm: null, remainingKm: null, dueDate: "2028-06-01", drivenBy: "time", status: "ok" });
  });
});

describe("evaluateRule — legal documents (SOAT, RTM)", () => {
  const soat: Rule = { kind: "legal", intervalKm: null, intervalMonths: null };

  it("uses the document's expiry date", () => {
    const r = evaluateRule({
      rule: soat,
      baseline: { date: "2026-01-10", km: null, expiresOn: "2027-01-10", isApproximate: false },
      currentKm: 30000,
      avgKmPerDay: 40,
      today,
    });
    expect(r).toMatchObject({ status: "ok", dueDate: "2027-01-10", remainingDays: 54, drivenBy: "expiry" });
    expect(r.dueKm).toBeNull();
  });

  it("is due soon within 30 days and overdue after expiry", () => {
    const soon = { date: "2025-12-01", km: null, expiresOn: "2026-12-01", isApproximate: false };
    expect(evaluateRule({ rule: soat, baseline: soon, currentKm: null, avgKmPerDay: null, today }).status).toBe(
      "due_soon",
    );
    const expired = { ...soon, expiresOn: "2026-11-16" };
    expect(evaluateRule({ rule: soat, baseline: expired, currentKm: null, avgKmPerDay: null, today }).status).toBe(
      "overdue",
    );
  });

  it("is no_baseline when the record has no expiry date", () => {
    const r = evaluateRule({
      rule: soat,
      baseline: { date: "2026-01-10", km: null, expiresOn: null, isApproximate: true },
      currentKm: null,
      avgKmPerDay: null,
      today,
    });
    expect(r.status).toBe("no_baseline");
  });
});

describe("compareEvaluations", () => {
  const e = (status: RuleEvaluation["status"], effectiveDueDate: string | null) =>
    ({ status, effectiveDueDate }) as RuleEvaluation;

  it("orders overdue → due_soon → no_baseline → ok, then by date with unknown dates last", () => {
    const items = [
      e("ok", "2026-12-01"),
      e("no_baseline", null),
      e("due_soon", "2026-12-10"),
      e("overdue", "2026-11-01"),
      e("due_soon", "2026-11-20"),
      e("ok", null),
      e("ok", "2026-11-30"),
    ];
    expect(items.sort(compareEvaluations).map((i) => `${i.status}:${i.effectiveDueDate}`)).toEqual([
      "overdue:2026-11-01",
      "due_soon:2026-11-20",
      "due_soon:2026-12-10",
      "no_baseline:null",
      "ok:2026-11-30",
      "ok:2026-12-01",
      "ok:null",
    ]);
  });

  it("treats equal dates as equal", () => {
    expect(compareEvaluations(e("ok", "2026-12-01"), e("ok", "2026-12-01"))).toBe(0);
    expect(compareEvaluations(e("ok", null), e("ok", null))).toBe(0);
  });
});
