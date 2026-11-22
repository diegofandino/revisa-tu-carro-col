import { z } from "zod";
import { todayInBogota } from "@/domain/maintenance/dates";
import { READING_DATE_MIN, REASON_MAX, REASON_MIN } from "./constants/reading";
import { kmSchema } from "./km";

const readingDate = z
  .string({ error: "Escribe la fecha de la lectura." })
  .pipe(z.iso.date({ error: "Escribe una fecha válida." }))
  .refine((d) => d >= READING_DATE_MIN, { message: "La fecha es demasiado antigua." })
  .refine((d) => d <= todayInBogota(), { message: "La fecha no puede ser futura." });

const reason = z
  .string({ error: "Escribe el motivo." })
  .trim()
  .min(REASON_MIN, `Escribe un motivo de al menos ${REASON_MIN} caracteres.`)
  .max(REASON_MAX, `El motivo puede tener hasta ${REASON_MAX} caracteres.`);

export const addReadingSchema = z.object({ readingDate, km: kmSchema("el kilometraje") });

export const correctReadingSchema = addReadingSchema.extend({
  readingId: z.uuid({ error: "No encontramos esa lectura." }),
  reason,
});

export const deleteReadingSchema = z.object({
  readingId: z.uuid({ error: "No encontramos esa lectura." }),
  reason,
});

export type AddReadingInput = z.infer<typeof addReadingSchema>;
export type CorrectReadingInput = z.infer<typeof correctReadingSchema>;
export type DeleteReadingInput = z.infer<typeof deleteReadingSchema>;
