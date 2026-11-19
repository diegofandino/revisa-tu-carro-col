/** Calendar date as `YYYY-MM-DD` (no time, no time zone). */
export type IsoDate = string;

export type MaintenanceKind = "mechanical" | "legal";

export type RuleStatus = "overdue" | "due_soon" | "no_baseline" | "ok";

/** Which threshold sets the effective due date. */
export type DueDriver = "km" | "time" | "expiry";

export interface Reading {
  date: IsoDate;
  km: number;
}

export interface Rule {
  kind: MaintenanceKind;
  intervalKm: number | null;
  intervalMonths: number | null;
}

/** Most recent active service record of the rule's type. */
export interface Baseline {
  date: IsoDate;
  km: number | null;
  /** Legal documents only (SOAT, RTM). */
  expiresOn: IsoDate | null;
  isApproximate: boolean;
}

export interface RuleEvaluation {
  status: RuleStatus;
  dueKm: number | null;
  dueDate: IsoDate | null;
  remainingKm: number | null;
  remainingDays: number | null;
  /** Date when `dueKm` is expected to be reached, from the average daily distance. */
  estimatedKmDate: IsoDate | null;
  /** Earliest of `dueDate` and `estimatedKmDate`. */
  effectiveDueDate: IsoDate | null;
  drivenBy: DueDriver | null;
  /** True when the effective date comes from the km estimate (UI must say "estimado"). */
  isEstimate: boolean;
  /** Baseline was entered as approximate (UI must say "aproximado"). */
  isApproximate: boolean;
}
