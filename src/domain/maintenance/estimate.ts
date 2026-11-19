import { ESTIMATE_MIN_SPAN_DAYS, ESTIMATE_WINDOW_DAYS } from "./constants/thresholds";
import { addDays, daysBetween } from "./dates";
import type { IsoDate, Reading } from "./types";

function averageOver(readings: Reading[]): number | null {
  if (readings.length < 2) return null;
  const sorted = [...readings].sort((a, b) => (a.date === b.date ? a.km - b.km : a.date < b.date ? -1 : 1));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = daysBetween(first.date, last.date);
  if (span < ESTIMATE_MIN_SPAN_DAYS) return null;
  return (last.km - first.km) / span;
}

/**
 * Average km per day (Spec 001 §4.5): readings of the last 90 days, falling back to the whole
 * history; null when there is not enough data (fewer than 2 readings or less than 14 days apart).
 */
export function averageKmPerDay(readings: Reading[], today: IsoDate): number | null {
  const windowStart = addDays(today, -ESTIMATE_WINDOW_DAYS);
  const recent = readings.filter((r) => r.date >= windowStart && r.date <= today);
  return averageOver(recent) ?? averageOver(readings);
}

/** Latest known odometer value (history is monotonic, so it is the maximum). */
export function currentKm(readings: Reading[]): number | null {
  if (readings.length === 0) return null;
  return Math.max(...readings.map((r) => r.km));
}
