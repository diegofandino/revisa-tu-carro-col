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
  /** At most one element: the highest active reading (see withLatestReading). */
  odometer_readings: { km: number; reading_date: string }[];
}

const VEHICLE_COLUMNS = "id, class, alias, brand, model, year, plate, archived_at, odometer_readings(km, reading_date)";
const READINGS = "odometer_readings";

/**
 * Embeds only the current reading (highest active km, latest date on ties) instead of the whole
 * history: the payload stays constant and PostgREST's max_rows cap can never truncate it.
 */
// biome-ignore lint/suspicious/noExplicitAny: postgrest builder generics differ between list and single queries
function withLatestReading<Q extends { is: any; order: any; limit: any }>(query: Q): Q {
  return query
    .is(`${READINGS}.deleted_at`, null)
    .order("km", { referencedTable: READINGS, ascending: false })
    .order("reading_date", { referencedTable: READINGS, ascending: false })
    .limit(1, { referencedTable: READINGS });
}

function toSummary(row: VehicleRow): VehicleSummary {
  const latest = row.odometer_readings[0] ?? null;
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

/** Active vehicles: bounded by the plan's vehicle limit, so no pagination is needed. */
export async function listActiveVehicles(supabase: SupabaseClient): Promise<VehicleSummary[]> {
  const query = supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  const { data, error } = await withLatestReading(query).returns<VehicleRow[]>();
  if (error) throw new Error("Could not load vehicles");
  return data.map(toSummary);
}

export interface VehiclePage {
  vehicles: VehicleSummary[];
  total: number;
}

/** Archived vehicles are unbounded: always paginated (most recently archived first). */
export async function listArchivedVehicles(
  supabase: SupabaseClient,
  range: { from: number; to: number },
): Promise<VehiclePage> {
  const query = supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS, { count: "exact" })
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .order("id", { ascending: true })
    .range(range.from, range.to);
  const { data, error, count } = await withLatestReading(query).returns<VehicleRow[]>();
  // PGRST103: the requested range starts past the last row (e.g. ?pagina=99). Not an error for users.
  if (error?.code === "PGRST103") {
    const { count: total, error: countError } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .not("archived_at", "is", null);
    if (countError) throw new Error("Could not count archived vehicles");
    return { vehicles: [], total: total ?? 0 };
  }
  if (error) throw new Error("Could not load archived vehicles");
  return { vehicles: data.map(toSummary), total: count ?? 0 };
}

/** Returns null when the vehicle doesn't exist or belongs to another account (RLS hides it). */
export async function getVehicle(supabase: SupabaseClient, id: string): Promise<VehicleSummary | null> {
  const query = supabase.from("vehicles").select(VEHICLE_COLUMNS).eq("id", id);
  const { data, error } = await withLatestReading(query).maybeSingle<VehicleRow>();
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
