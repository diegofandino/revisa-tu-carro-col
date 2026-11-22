/** Must match the correction_reason CHECK in *_odometer_readings.sql. */
export const REASON_MIN = 5;
export const REASON_MAX = 200;
/** Earliest reading date accepted by the form (the database only forbids future dates). */
export const READING_DATE_MIN = "1950-01-01";
/** Readings shown on the vehicle page (most recent first); keeps the query bounded. */
export const READINGS_PAGE_SIZE = 50;
