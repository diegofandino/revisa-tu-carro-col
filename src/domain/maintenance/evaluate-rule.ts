import { DUE_SOON_DAYS, DUE_SOON_KM_RATIO } from "./constants/thresholds";
import { addDays, addMonths, daysBetween, minDate } from "./dates";
import type { Baseline, DueDriver, IsoDate, Rule, RuleEvaluation, RuleStatus } from "./types";

const EMPTY: Omit<RuleEvaluation, "status" | "isApproximate"> = {
  dueKm: null,
  dueDate: null,
  remainingKm: null,
  remainingDays: null,
  estimatedKmDate: null,
  effectiveDueDate: null,
  drivenBy: null,
  isEstimate: false,
};

export interface EvaluateRuleInput {
  rule: Rule;
  baseline: Baseline | null;
  currentKm: number | null;
  avgKmPerDay: number | null;
  today: IsoDate;
}

/** Spec 001 §4: due point ("whichever comes first"), remaining values, km-based estimate and status. */
export function evaluateRule({ rule, baseline, currentKm, avgKmPerDay, today }: EvaluateRuleInput): RuleEvaluation {
  if (!baseline) return { ...EMPTY, status: "no_baseline", isApproximate: false };

  if (rule.kind === "legal") {
    if (!baseline.expiresOn) return { ...EMPTY, status: "no_baseline", isApproximate: baseline.isApproximate };
    const remainingDays = daysBetween(today, baseline.expiresOn);
    return {
      ...EMPTY,
      status: statusFrom(null, null, remainingDays),
      dueDate: baseline.expiresOn,
      remainingDays,
      effectiveDueDate: baseline.expiresOn,
      drivenBy: "expiry",
      isApproximate: baseline.isApproximate,
    };
  }

  const dueKm = rule.intervalKm !== null && baseline.km !== null ? baseline.km + rule.intervalKm : null;
  const dueDate = rule.intervalMonths !== null ? addMonths(baseline.date, rule.intervalMonths) : null;
  const remainingKm = dueKm !== null && currentKm !== null ? dueKm - currentKm : null;
  const remainingDays = dueDate !== null ? daysBetween(today, dueDate) : null;

  const estimatedKmDate =
    remainingKm !== null && remainingKm > 0 && avgKmPerDay !== null && avgKmPerDay > 0
      ? addDays(today, Math.ceil(remainingKm / avgKmPerDay))
      : null;

  const effectiveDueDate = minDate(dueDate, estimatedKmDate);
  let drivenBy: DueDriver | null = null;
  if (effectiveDueDate !== null) drivenBy = effectiveDueDate === dueDate ? "time" : "km";
  else if (dueKm !== null) drivenBy = "km";

  return {
    status: statusFrom(remainingKm, rule.intervalKm, remainingDays),
    dueKm,
    dueDate,
    remainingKm,
    remainingDays,
    estimatedKmDate,
    effectiveDueDate,
    drivenBy,
    isEstimate: drivenBy === "km" && effectiveDueDate !== null,
    isApproximate: baseline.isApproximate,
  };
}

function statusFrom(remainingKm: number | null, intervalKm: number | null, remainingDays: number | null): RuleStatus {
  if ((remainingKm !== null && remainingKm <= 0) || (remainingDays !== null && remainingDays < 0)) return "overdue";
  const kmSoon = remainingKm !== null && intervalKm !== null && remainingKm <= intervalKm * DUE_SOON_KM_RATIO;
  const daysSoon = remainingDays !== null && remainingDays <= DUE_SOON_DAYS;
  return kmSoon || daysSoon ? "due_soon" : "ok";
}

const STATUS_ORDER: Record<RuleStatus, number> = { overdue: 0, due_soon: 1, no_baseline: 2, ok: 3 };

/** Dashboard order (Spec 002 §8): by status, then by effective due date (unknown dates last). */
export function compareEvaluations(a: RuleEvaluation, b: RuleEvaluation): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (byStatus !== 0) return byStatus;
  if (a.effectiveDueDate === b.effectiveDueDate) return 0;
  if (a.effectiveDueDate === null) return 1;
  if (b.effectiveDueDate === null) return -1;
  return a.effectiveDueDate < b.effectiveDueDate ? -1 : 1;
}
