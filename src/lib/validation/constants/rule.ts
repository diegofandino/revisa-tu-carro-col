/** Must match the CHECK constraints in *_maintenance_rules.sql. */
export const INTERVAL_KM_MIN = 100;
export const INTERVAL_KM_MAX = 200_000;
export const INTERVAL_MONTHS_MIN = 1;
export const INTERVAL_MONTHS_MAX = 120;

export const MAINTENANCE_KINDS = ["mechanical", "legal"] as const;
export type MaintenanceKind = (typeof MAINTENANCE_KINDS)[number];
