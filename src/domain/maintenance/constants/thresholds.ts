/** Spec 001 §4.6: "due soon" when ≤ 10% of the km interval remains… */
export const DUE_SOON_KM_RATIO = 0.1;
/** …or ≤ 30 days remain. */
export const DUE_SOON_DAYS = 30;

/** Spec 001 §4.5: average daily distance uses readings from the last 90 days… */
export const ESTIMATE_WINDOW_DAYS = 90;
/** …and needs at least 2 readings spanning 14 days or more. */
export const ESTIMATE_MIN_SPAN_DAYS = 14;

/** Business dates are always Colombian calendar dates. */
export const BUSINESS_TIME_ZONE = "America/Bogota";
