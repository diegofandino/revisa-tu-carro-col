/** Must match the CHECK constraints in supabase/migrations/*_vehicles.sql and *_odometer_readings.sql. */
export const VEHICLE_ALIAS_MAX = 50;
export const VEHICLE_TEXT_MAX = 50;
export const VEHICLE_YEAR_MIN = 1950;
export const PLATE_PATTERN = /^[A-Z0-9]{5,7}$/;
export const KM_MAX = 2_000_000;

export const VEHICLE_CLASSES = ["car", "motorcycle"] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  car: "Carro",
  motorcycle: "Moto",
};
