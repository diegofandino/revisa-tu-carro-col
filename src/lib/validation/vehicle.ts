import { z } from "zod";
import { todayInBogota } from "@/domain/maintenance/dates";
import {
  KM_MAX,
  PLATE_PATTERN,
  VEHICLE_ALIAS_MAX,
  VEHICLE_CLASSES,
  VEHICLE_TEXT_MAX,
  VEHICLE_YEAR_MIN,
} from "./constants/vehicle";

/** Same normalization as the database trigger: uppercase, no spaces or hyphens. */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} es demasiado largo.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const wholeNumber = (field: string) =>
  z
    .string({ error: `Escribe ${field}.` })
    .trim()
    .regex(/^\d+$/, `Escribe ${field} solo con números, sin puntos ni comas.`)
    .transform(Number);

export const vehicleSchema = z.object({
  class: z.enum(VEHICLE_CLASSES, { error: "Elige si es carro o moto." }),
  alias: z
    .string({ error: "Escribe un nombre para el vehículo." })
    .trim()
    .min(1, "Escribe un nombre para el vehículo.")
    .max(VEHICLE_ALIAS_MAX, `El nombre puede tener hasta ${VEHICLE_ALIAS_MAX} caracteres.`),
  brand: optionalText(VEHICLE_TEXT_MAX, "La marca"),
  model: optionalText(VEHICLE_TEXT_MAX, "El modelo"),
  year: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .regex(/^\d{4}$/, "Escribe el año con 4 dígitos.")
        .transform(Number)
        .refine((y) => y >= VEHICLE_YEAR_MIN && y <= Number(todayInBogota().slice(0, 4)) + 1, {
          message: `El año debe estar entre ${VEHICLE_YEAR_MIN} y el próximo año.`,
        })
        .nullable(),
    ),
  plate: z
    .string()
    .optional()
    .transform((v) => normalizePlate(v ?? ""))
    .pipe(
      z
        .string()
        .refine((p) => p === "" || PLATE_PATTERN.test(p), {
          message: "La placa debe tener de 5 a 7 letras o números (por ejemplo ABC123).",
        })
        .transform((p) => (p === "" ? null : p)),
    ),
});

export const createVehicleSchema = vehicleSchema.extend({
  currentKm: wholeNumber("el kilometraje actual").pipe(
    z.number().max(KM_MAX, "El kilometraje parece demasiado alto. Revísalo."),
  ),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const uuidSchema = z.uuid();
