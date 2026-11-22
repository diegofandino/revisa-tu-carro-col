/** Must match the CHECK constraints in *_service_records.sql. */
export const COST_MAX = 1_000_000_000;
export const WORKSHOP_MAX = 100;
export const NOTES_MAX = 1000;
/** expires_on must be within 10 years of the service date. */
export const EXPIRY_MAX_YEARS = 10;
/** Services shown per vehicle (newest first); keeps the query bounded. */
export const SERVICES_PAGE_SIZE = 50;
