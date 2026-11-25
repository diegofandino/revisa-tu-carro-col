import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceKind } from "@/domain/maintenance/types";
import { buildVehicleDue, type VehicleDue } from "@/domain/maintenance/vehicle-due";
import { listBaselines, listEstimateReadings } from "@/server/repositories/due";
import { listCurrentRules } from "@/server/repositories/rules";

export interface DueRule {
  ruleId: string;
  maintenanceTypeId: string;
  name: string;
  kind: MaintenanceKind;
  rule: { kind: MaintenanceKind; intervalKm: number | null; intervalMonths: number | null };
}

export type VehicleDueView = VehicleDue<DueRule>;

/** Upcoming services of one vehicle (rules, baselines and readings are read under the caller's RLS). */
export async function loadVehicleDue(
  supabase: SupabaseClient,
  vehicleId: string,
  today: string,
): Promise<VehicleDueView> {
  const [rules, baselines, readings] = await Promise.all([
    listCurrentRules(supabase, vehicleId),
    listBaselines(supabase, vehicleId),
    listEstimateReadings(supabase, vehicleId, today),
  ]);
  const dueRules: DueRule[] = rules.map((r) => ({
    ruleId: r.id,
    maintenanceTypeId: r.maintenanceType.id,
    name: r.maintenanceType.name,
    kind: r.maintenanceType.kind,
    rule: { kind: r.maintenanceType.kind, intervalKm: r.intervalKm, intervalMonths: r.intervalMonths },
  }));
  return buildVehicleDue(dueRules, baselines, readings, today);
}
