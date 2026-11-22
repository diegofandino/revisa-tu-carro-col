import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VehicleClass } from "@/lib/validation/constants/vehicle";
import type { CreateVehicleInput, VehicleInput } from "@/lib/validation/vehicle";
import type { DbError } from "@/server/db-errors";

export interface VehicleSummary {
  id: string;
  class: VehicleClass;
  alias: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  archivedAt: string | null;
  currentKm: number | null;
  lastReadingDate: string | null;
}

interface VehicleRow {
  id: string;
  class: VehicleClass;
  alias: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  archived_at: string | null;
  odometer_readings: { km: number; reading_date: string; deleted_at: string | null }[];
}

const VEHICLE_COLUMNS =
  "id, class, alias, brand, model, year, plate, archived_at, odometer_readings(km, reading_date, deleted_at)";

function toSummary(row: VehicleRow): VehicleSummary {
  const active = row.odometer_readings.filter((r) => r.deleted_at === null);
  const latest = active.reduce<(typeof active)[number] | null>(
    (best, r) => (!best || r.km > best.km || (r.km === best.km && r.reading_date > best.reading_date) ? r : best),
    null,
  );
  return {
    id: row.id,
    class: row.class,
    alias: row.alias,
    brand: row.brand,
    model: row.model,
    year: row.year,
    plate: row.plate,
    archivedAt: row.archived_at,
    currentKm: latest?.km ?? null,
    lastReadingDate: latest?.reading_date ?? null,
  };
}

export async function listVehicles(supabase: SupabaseClient, { archived }: { archived: boolean }) {
  let query = supabase.from("vehicles").select(VEHICLE_COLUMNS).order("created_at", { ascending: true });
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data, error } = await query.returns<VehicleRow[]>();
  if (error) throw new Error("Could not load vehicles");
  return data.map(toSummary);
}

/** Returns null when the vehicle doesn't exist or belongs to another account (RLS hides it). */
export async function getVehicle(supabase: SupabaseClient, id: string): Promise<VehicleSummary | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("id", id)
    .maybeSingle<VehicleRow>();
  if (error) throw new Error("Could not load vehicle");
  return data ? toSummary(data) : null;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

export async function createVehicle(
  supabase: SupabaseClient,
  accountId: string,
  input: CreateVehicleInput,
): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("create_vehicle", {
    p_account_id: accountId,
    p_class: input.class,
    p_alias: input.alias,
    p_current_km: input.currentKm,
    p_brand: input.brand,
    p_model: input.model,
    p_year: input.year,
    p_plate: input.plate,
  });
  return error ? { ok: false, error } : { ok: true, value: data as string };
}

/** Explicit allowlist of editable columns (no mass assignment). */
export async function updateVehicle(
  supabase: SupabaseClient,
  id: string,
  input: VehicleInput,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("vehicles")
    .update({
      class: input.class,
      alias: input.alias,
      brand: input.brand,
      model: input.model,
      year: input.year,
      plate: input.plate,
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}

/** The database stamps the real time; the value sent only marks archived / not archived. */
export async function setVehicleArchived(
  supabase: SupabaseClient,
  id: string,
  archived: boolean,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("vehicles")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}
