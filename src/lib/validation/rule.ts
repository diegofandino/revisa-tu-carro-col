import { z } from "zod";
import type { FieldErrors } from "./auth";
import {
  INTERVAL_KM_MAX,
  INTERVAL_KM_MIN,
  INTERVAL_MONTHS_MAX,
  INTERVAL_MONTHS_MIN,
  type MaintenanceKind,
} from "./constants/rule";

/** Optional whole number typed by the user ("5000" or "5.000"); empty → null. */
const optionalWholeNumber = (field: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\./g, "") : ""))
    .pipe(
      z
        .string()
        .refine((v) => v === "" || /^\d+$/.test(v), { message: `Escribe ${field} solo con números.` })
        .transform((v) => (v === "" ? null : Number(v)))
        .refine((n) => n === null || (n >= min && n <= max), {
          message: `${field[0].toUpperCase()}${field.slice(1)} debe estar entre ${min.toLocaleString("es-CO")} y ${max.toLocaleString("es-CO")}.`,
        }),
    );

const intervals = {
  intervalKm: optionalWholeNumber("el intervalo en km", INTERVAL_KM_MIN, INTERVAL_KM_MAX),
  intervalMonths: optionalWholeNumber("el intervalo en meses", INTERVAL_MONTHS_MIN, INTERVAL_MONTHS_MAX),
};

export const createRuleSchema = z.object({
  maintenanceTypeId: z.uuid({ error: "Elige el mantenimiento." }),
  ...intervals,
});

export const updateRuleSchema = z.object({
  ruleId: z.uuid({ error: "No encontramos esa regla." }),
  ...intervals,
});

export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

/**
 * Rules that depend on the maintenance kind (the database enforces the same):
 * mechanical needs km and/or months; legal documents (SOAT, RTM) store no interval.
 */
export function intervalErrorsForKind(
  kind: MaintenanceKind,
  intervalKm: number | null,
  intervalMonths: number | null,
): FieldErrors | null {
  if (kind === "mechanical" && intervalKm === null && intervalMonths === null) {
    return { intervalKm: "Escribe cada cuántos km, cada cuántos meses, o ambos." };
  }
  if (kind === "legal" && (intervalKm !== null || intervalMonths !== null)) {
    return { intervalKm: "SOAT y técnico-mecánica no usan intervalo: se recuerdan por su fecha de vencimiento." };
  }
  return null;
}
