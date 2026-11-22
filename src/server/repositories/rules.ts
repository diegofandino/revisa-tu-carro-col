import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceKind } from "@/lib/validation/constants/rule";
import type { VehicleClass } from "@/lib/validation/constants/vehicle";
import type { CreateRuleInput, UpdateRuleInput } from "@/lib/validation/rule";
import type { DbError } from "@/server/db-errors";

export interface MaintenanceType {
  id: string;
  code: string;
  name: string;
  kind: MaintenanceKind;
  appliesTo: VehicleClass[];
}

export interface RuleItem {
  id: string;
  maintenanceType: Pick<MaintenanceType, "id" | "code" | "name" | "kind">;
  intervalKm: number | null;
  intervalMonths: number | null;
}

interface TypeRow {
  id: string;
  code: string;
  name_es: string;
  kind: MaintenanceKind;
  applies_to: VehicleClass[];
}

interface RuleRow {
  id: string;
  interval_km: number | null;
  interval_months: number | null;
  maintenance_types: Pick<TypeRow, "id" | "code" | "name_es" | "kind">;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

/** Read-only global catalog (small and bounded; seeded by migration). */
export async function listMaintenanceTypes(supabase: SupabaseClient): Promise<MaintenanceType[]> {
  const { data, error } = await supabase
    .from("maintenance_types")
    .select("id, code, name_es, kind, applies_to")
    .order("kind", { ascending: true })
    .order("name_es", { ascending: true })
    .returns<TypeRow[]>();
  if (error) throw new Error("Could not load maintenance types");
  return data.map((t) => ({ id: t.id, code: t.code, name: t.name_es, kind: t.kind, appliesTo: t.applies_to }));
}

/** Current (non-archived) rules of a vehicle: at most one per maintenance type, so bounded by the catalog. */
export async function listCurrentRules(supabase: SupabaseClient, vehicleId: string): Promise<RuleItem[]> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .select("id, interval_km, interval_months, maintenance_types(id, code, name_es, kind)")
    .eq("vehicle_id", vehicleId)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .returns<RuleRow[]>();
  if (error) throw new Error("Could not load rules");
  return data.map((r) => ({
    id: r.id,
    maintenanceType: {
      id: r.maintenance_types.id,
      code: r.maintenance_types.code,
      name: r.maintenance_types.name_es,
      kind: r.maintenance_types.kind,
    },
    intervalKm: r.interval_km,
    intervalMonths: r.interval_months,
  }));
}

export async function createRule(
  supabase: SupabaseClient,
  accountId: string,
  vehicleId: string,
  input: CreateRuleInput,
): Promise<Result<true>> {
  const { error } = await supabase.from("maintenance_rules").insert({
    account_id: accountId,
    vehicle_id: vehicleId,
    maintenance_type_id: input.maintenanceTypeId,
    interval_km: input.intervalKm,
    interval_months: input.intervalMonths,
  });
  return error ? { ok: false, error } : { ok: true, value: true };
}

/** Only the intervals are editable (explicit allowlist); returns false if no current rule of this vehicle matched. */
export async function updateRuleIntervals(
  supabase: SupabaseClient,
  vehicleId: string,
  input: UpdateRuleInput,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .update({ interval_km: input.intervalKm, interval_months: input.intervalMonths })
    .eq("id", input.ruleId)
    .eq("vehicle_id", vehicleId)
    .is("archived_at", null)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}

/** The database stamps the real time. */
export async function archiveRule(
  supabase: SupabaseClient,
  vehicleId: string,
  ruleId: string,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", ruleId)
    .eq("vehicle_id", vehicleId)
    .is("archived_at", null)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}

/** Kind of a rule's maintenance type, scoped to the vehicle (RLS limits it to the caller's account). */
export async function getRuleKind(
  supabase: SupabaseClient,
  vehicleId: string,
  ruleId: string,
): Promise<MaintenanceKind | null> {
  const { data } = await supabase
    .from("maintenance_rules")
    .select("maintenance_types(kind)")
    .eq("id", ruleId)
    .eq("vehicle_id", vehicleId)
    .is("archived_at", null)
    .maybeSingle<{ maintenance_types: { kind: MaintenanceKind } }>();
  return data?.maintenance_types.kind ?? null;
}
