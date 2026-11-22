import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { READINGS_PAGE_SIZE } from "@/lib/validation/constants/reading";
import type { AddReadingInput, CorrectReadingInput, DeleteReadingInput } from "@/lib/validation/reading";
import type { DbError } from "@/server/db-errors";

export interface ReadingItem {
  id: string;
  readingDate: string;
  km: number;
  source: "manual" | "service";
  correctionReason: string | null;
}

interface ReadingRow {
  id: string;
  reading_date: string;
  km: number;
  source: "manual" | "service";
  correction_reason: string | null;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

/** Active readings, newest first, bounded to READINGS_PAGE_SIZE. RLS limits them to the caller's account. */
export async function listReadings(supabase: SupabaseClient, vehicleId: string): Promise<ReadingItem[]> {
  const { data, error } = await supabase
    .from("odometer_readings")
    .select("id, reading_date, km, source, correction_reason")
    .eq("vehicle_id", vehicleId)
    .is("deleted_at", null)
    .order("reading_date", { ascending: false })
    .order("km", { ascending: false })
    .limit(READINGS_PAGE_SIZE)
    .returns<ReadingRow[]>();
  if (error) throw new Error("Could not load readings");
  return data.map((r) => ({
    id: r.id,
    readingDate: r.reading_date,
    km: r.km,
    source: r.source,
    correctionReason: r.correction_reason,
  }));
}

export async function addReading(
  supabase: SupabaseClient,
  accountId: string,
  vehicleId: string,
  input: AddReadingInput,
): Promise<Result<true>> {
  // source is not granted to users: the database always stores "manual" here.
  const { error } = await supabase
    .from("odometer_readings")
    .insert({ account_id: accountId, vehicle_id: vehicleId, reading_date: input.readingDate, km: input.km });
  return error ? { ok: false, error } : { ok: true, value: true };
}

/** Only active manual readings of this vehicle can be corrected; returns false if none matched. */
export async function correctReading(
  supabase: SupabaseClient,
  vehicleId: string,
  input: CorrectReadingInput,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("odometer_readings")
    .update({ km: input.km, reading_date: input.readingDate, correction_reason: input.reason })
    .eq("id", input.readingId)
    .eq("vehicle_id", vehicleId)
    .eq("source", "manual")
    .is("deleted_at", null)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}

/** Soft delete with a reason (the database stamps the time and audits it). */
export async function deleteReading(
  supabase: SupabaseClient,
  vehicleId: string,
  input: DeleteReadingInput,
): Promise<Result<boolean>> {
  const { data, error } = await supabase
    .from("odometer_readings")
    .update({ deleted_at: new Date().toISOString(), correction_reason: input.reason })
    .eq("id", input.readingId)
    .eq("vehicle_id", vehicleId)
    .eq("source", "manual")
    .is("deleted_at", null)
    .select("id");
  if (error) return { ok: false, error };
  return { ok: true, value: data.length === 1 };
}
