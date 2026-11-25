import { averageKmPerDay, currentKm } from "./estimate";
import { compareEvaluations, evaluateRule } from "./evaluate-rule";
import type { Baseline, IsoDate, Reading, Rule, RuleEvaluation, RuleStatus } from "./types";

/** A current rule of the vehicle; extra fields (id, name…) are carried through to the result. */
export interface DueRuleInput {
  maintenanceTypeId: string;
  rule: Rule;
}

export type DueItem<T extends DueRuleInput> = T & { evaluation: RuleEvaluation };

export type StatusCounts = Record<RuleStatus, number>;

export interface VehicleDue<T extends DueRuleInput> {
  currentKm: number | null;
  avgKmPerDay: number | null;
  /** Ordered: overdue → due soon → no baseline → ok, then by effective due date. */
  items: DueItem<T>[];
  counts: StatusCounts;
}

const emptyCounts = (): StatusCounts => ({ overdue: 0, due_soon: 0, no_baseline: 0, ok: 0 });

/**
 * Upcoming-services view of one vehicle (task 010). `baselines` maps a maintenance type id to the
 * latest non-voided service of that type (view latest_service_records); `readings` are the active
 * readings used for the current km and the daily average (last 90 days plus the oldest and newest).
 */
export function buildVehicleDue<T extends DueRuleInput>(
  rules: readonly T[],
  baselines: ReadonlyMap<string, Baseline>,
  readings: readonly Reading[],
  today: IsoDate,
): VehicleDue<T> {
  const km = currentKm([...readings]);
  const avg = averageKmPerDay([...readings], today);
  const items = rules
    .map((r) => ({
      ...r,
      evaluation: evaluateRule({
        rule: r.rule,
        baseline: baselines.get(r.maintenanceTypeId) ?? null,
        currentKm: km,
        avgKmPerDay: avg,
        today,
      }),
    }))
    .sort((a, b) => compareEvaluations(a.evaluation, b.evaluation));
  return { currentKm: km, avgKmPerDay: avg, items, counts: countByStatus(items.map((i) => i.evaluation)) };
}

export function countByStatus(evaluations: readonly Pick<RuleEvaluation, "status">[]): StatusCounts {
  const counts = emptyCounts();
  for (const e of evaluations) counts[e.status] += 1;
  return counts;
}

/** Totals across vehicles for the dashboard summary. */
export function sumCounts(all: readonly StatusCounts[]): StatusCounts {
  const total = emptyCounts();
  for (const c of all) for (const key of Object.keys(total) as RuleStatus[]) total[key] += c[key];
  return total;
}
