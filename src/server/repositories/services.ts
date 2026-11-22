import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceKind } from "@/lib/validation/constants/rule";
import { SERVICES_PAGE_SIZE } from "@/lib/validation/constants/service";
import type { CreateServiceInput, VoidServiceInput } from "@/lib/validation/service";
import type { DbError } from "@/server/db-errors";

export interface ServiceItem {
  id: string;
  maintenanceType: { id: string; name: string; kind: MaintenanceKind };
  serviceDate: string;
  km: number | null;
  expiresOn: string | null;
  costCop: number | null;
  workshop: string | null;
  notes: string | null;
  isApproximate: boolean;
  voidedAt: string | null;
  voidReason: string | null;
}

interface ServiceRow {
  id: string;
  service_date: string;
  km: number | null;
  expires_on: string | null;
  cost_cop: number | null;
  workshop: string | null;
  notes: string | null;
  is_approximate: boolean;
  voided_at: string | null;
  void_reason: string | null;
  maintenance_types: { id: string; name_es: string; kind: MaintenanceKind };
}

type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

const COLUMNS =
  "id, service_date, km, expires_on, cost_cop, workshop, notes, is_approximate, voided_at, void_reason, maintenance_types(id, name_es, kind)";

/** Service history (voided ones included and marked), newest first, bounded to SERVICES_PAGE_SIZE. */
export async function listServices(supabase: SupabaseClient, vehicleId: string): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from("service_records")
    .select(COLUMNS)
    .eq("vehicle_id", vehicleId)
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(SERVICES_PAGE_SIZE)
    .returns<ServiceRow[]>();
  if (error) throw new Error("Could not load services");
  return data.map((r) => ({
    id: r.id,
    maintenanceType: { id: r.maintenance_types.id, name: r.maintenance_types.name_es, kind: r.maintenance_types.kind },
    serviceDate: r.service_date,
    km: r.km,
    expiresOn: r.expires_on,
    costCop: r.cost_cop,
    workshop: r.workshop,
    notes: r.notes,
    isApproximate: r.is_approximate,
    voidedAt: r.voided_at,
    voidReason: r.void_reason,
  }));
}

/** Inserting a mechanical service also creates its odometer reading (database trigger, same transaction). */
export async function createService(
  supabase: SupabaseClient,
  accountId: string,
  vehicleId: string,
  input: CreateServiceInput,
): Promise<Result<true>> {
  const { error } = await supabase.from("service_records").insert({
    account_id: accountId,
    vehicle_id: vehicleId,
    maintenance_type_id: input.maintenanceTypeId,
    service_date: input.serviceDate,
    km: input.km,
    expires_on: input.expiresOn,
    cost_cop: input.costCop,
    workshop: input.workshop,
    notes: input.notes,
    is_approximate: input.isApproximate,
  });
  return error ? { ok: false, error } : { ok: true, value: true };
}

/** Void with a reason (only once; the database stamps the time and removes its reading). */
export async function voidService(
  supabase: SupabaseClient,
  vehicleId: string,
  input: VoidServiceInput,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("service_records")
    .update({ voided_at: new Date().toISOString(), void_reason: input.reason })
    .eq("id", input.serviceId)
    .eq("vehicle_id", vehicleId)
    .is("voided_at", null)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}
