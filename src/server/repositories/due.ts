import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ESTIMATE_WINDOW_DAYS } from "@/domain/maintenance/constants/thresholds";
import { addDays } from "@/domain/maintenance/dates";
import type { Baseline, IsoDate, Reading } from "@/domain/maintenance/types";

/** Readings inside the 90-day window; far above any real usage (several readings a day). */
const WINDOW_READINGS_MAX = 500;

interface BaselineRow {
  maintenance_type_id: string;
  service_date: string;
  km: number | null;
  expires_on: string | null;
  is_approximate: boolean;
}

interface ReadingRow {
  reading_date: string;
  km: number;
}

/**
 * Baseline per maintenance type: latest non-voided service (view latest_service_records, invoker
 * rights so RLS applies). One row per type, so bounded by the catalog.
 */
export async function listBaselines(supabase: SupabaseClient, vehicleId: string): Promise<Map<string, Baseline>> {
  const { data, error } = await supabase
    .from("latest_service_records")
    .select("maintenance_type_id, service_date, km, expires_on, is_approximate")
    .eq("vehicle_id", vehicleId)
    .returns<BaselineRow[]>();
  if (error) throw new Error("Could not load latest services");
  return new Map(
    data.map((r) => [
      r.maintenance_type_id,
      { date: r.service_date, km: r.km, expiresOn: r.expires_on, isApproximate: r.is_approximate },
    ]),
  );
}

/**
 * Readings needed for the current km and the average km/day (Spec 001 §4.5): the last 90 days
 * (bounded) plus the oldest and the newest active reading for the whole-history fallback.
 */
export async function listEstimateReadings(
  supabase: SupabaseClient,
  vehicleId: string,
  today: IsoDate,
): Promise<Reading[]> {
  const active = () =>
    supabase.from("odometer_readings").select("reading_date, km").eq("vehicle_id", vehicleId).is("deleted_at", null);

  const [recent, oldest, newest] = await Promise.all([
    active()
      .gte("reading_date", addDays(today, -ESTIMATE_WINDOW_DAYS))
      .order("reading_date", { ascending: false })
      .order("km", { ascending: false })
      .limit(WINDOW_READINGS_MAX)
      .returns<ReadingRow[]>(),
    active()
      .order("reading_date", { ascending: true })
      .order("km", { ascending: true })
      .limit(1)
      .returns<ReadingRow[]>(),
    active()
      .order("km", { ascending: false })
      .order("reading_date", { ascending: false })
      .limit(1)
      .returns<ReadingRow[]>(),
  ]);
  if (recent.error || oldest.error || newest.error) throw new Error("Could not load readings");
  return [...recent.data, ...oldest.data, ...newest.data].map((r) => ({ date: r.reading_date, km: r.km }));
}
