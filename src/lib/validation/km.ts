import { z } from "zod";
import { KM_MAX } from "./constants/vehicle";

/** Odometer value typed by the user: digits only (no "45.000" or "45,5"), 0..KM_MAX. */
export const kmSchema = (field: string) =>
  z
    .string({ error: `Escribe ${field}.` })
    .trim()
    .regex(/^\d+$/, `Escribe ${field} solo con números, sin puntos ni comas.`)
    .transform(Number)
    .pipe(z.number().max(KM_MAX, "El kilometraje parece demasiado alto. Revísalo."));
