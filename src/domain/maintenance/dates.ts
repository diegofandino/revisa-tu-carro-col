import { BUSINESS_TIME_ZONE } from "./constants/thresholds";
import type { IsoDate } from "./types";

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a calendar date to a UTC midnight timestamp, rejecting impossible dates. */
function toUtc(date: IsoDate): number {
  const match = ISO_DATE.exec(date);
  if (!match) throw new RangeError(`Invalid date: ${date}`);
  const [, y, m, d] = match.map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`Invalid date: ${date}`);
  }
  return utc;
}

function fromUtc(utc: number): IsoDate {
  return new Date(utc).toISOString().slice(0, 10);
}

/** Today's calendar date in Colombia. */
export function todayInBogota(now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Adds calendar months, clamping to the end of the month (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const start = new Date(toUtc(date));
  const targetMonth = start.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), targetMonth + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(start.getUTCFullYear(), targetMonth, Math.min(start.getUTCDate(), lastDay)));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

export function minDate(a: IsoDate | null, b: IsoDate | null): IsoDate | null {
  if (a === null) return b;
  if (b === null) return a;
  return a <= b ? a : b;
}
