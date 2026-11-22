import { z } from "zod";
import { addMonths, todayInBogota } from "@/domain/maintenance/dates";
import type { FieldErrors } from "./auth";
import { READING_DATE_MIN, REASON_MAX, REASON_MIN } from "./constants/reading";
import type { MaintenanceKind } from "./constants/rule";
import { COST_MAX, EXPIRY_MAX_YEARS, NOTES_MAX, WORKSHOP_MAX } from "./constants/service";
import { KM_MAX } from "./constants/vehicle";

const emptyToNull = (v: string | undefined) => (v === undefined || v.trim() === "" ? null : v.trim());

const isoDate = (message: string) => z.iso.date({ error: message });

/** Optional amount typed by the user: digits with optional dots as thousands separators ("150.000"). */
const optionalAmount = (field: string, max: number) =>
  z
    .string()
    .optional()
    .transform(emptyToNull)
    .refine((v) => v === null || /^\d{1,3}(\.\d{3})*$|^\d+$/.test(v), {
      message: `Escribe ${field} solo con números (puedes usar puntos de miles).`,
    })
    .transform((v) => (v === null ? null : Number(v.replace(/\./g, ""))))
    .refine((n) => n === null || n <= max, {
      message: `${field[0].toUpperCase()}${field.slice(1)} es demasiado alto.`,
    });

const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform(emptyToNull)
    .refine((v) => v === null || v.length <= max, { message: `${label} puede tener hasta ${max} caracteres.` });

export const createServiceSchema = z
  .object({
    maintenanceTypeId: z.uuid({ error: "Elige el mantenimiento." }),
    serviceDate: z
      .string({ error: "Escribe la fecha del servicio." })
      .pipe(isoDate("Escribe una fecha válida."))
      .refine((d) => d >= READING_DATE_MIN, { message: "La fecha es demasiado antigua." })
      .refine((d) => d <= todayInBogota(), { message: "La fecha no puede ser futura." }),
    km: optionalAmount("el kilometraje", KM_MAX),
    expiresOn: z
      .string()
      .optional()
      .transform(emptyToNull)
      .pipe(isoDate("Escribe una fecha de vencimiento válida.").nullable()),
    costCop: optionalAmount("el costo", COST_MAX),
    workshop: optionalText(WORKSHOP_MAX, "El taller"),
    notes: optionalText(NOTES_MAX, "Las notas"),
    isApproximate: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
  })
  .superRefine((data, ctx) => {
    if (data.expiresOn === null) return;
    if (data.expiresOn < data.serviceDate) {
      ctx.addIssue({ code: "custom", path: ["expiresOn"], message: "El vencimiento no puede ser antes del servicio." });
    } else if (data.expiresOn > addMonths(data.serviceDate, EXPIRY_MAX_YEARS * 12)) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresOn"],
        message: `El vencimiento no puede ser más de ${EXPIRY_MAX_YEARS} años después del servicio.`,
      });
    }
  });

export const voidServiceSchema = z.object({
  serviceId: z.uuid({ error: "No encontramos ese servicio." }),
  reason: z
    .string({ error: "Escribe el motivo." })
    .trim()
    .min(REASON_MIN, `Escribe un motivo de al menos ${REASON_MIN} caracteres.`)
    .max(REASON_MAX, `El motivo puede tener hasta ${REASON_MAX} caracteres.`),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type VoidServiceInput = z.infer<typeof voidServiceSchema>;

/**
 * Rules that depend on the maintenance kind (the database enforces the same):
 * mechanical services need km and no expiry; legal documents (SOAT, RTM) need the expiry date.
 */
export function serviceErrorsForKind(
  kind: MaintenanceKind,
  km: number | null,
  expiresOn: string | null,
): FieldErrors | null {
  if (kind === "mechanical") {
    if (km === null) return { km: "Escribe el kilometraje del vehículo cuando se hizo el servicio." };
    if (expiresOn !== null) return { expiresOn: "La fecha de vencimiento solo aplica a SOAT y técnico-mecánica." };
    return null;
  }
  return expiresOn === null ? { expiresOn: "Escribe la fecha de vencimiento que aparece en el documento." } : null;
}
