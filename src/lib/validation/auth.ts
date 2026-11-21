import { z } from "zod";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./constants/password";

const email = z
  .string({ error: "Escribe tu correo." })
  .trim()
  .toLowerCase()
  .min(1, "Escribe tu correo.")
  .max(EMAIL_MAX_LENGTH, "El correo es demasiado largo.")
  .pipe(z.email("Escribe un correo válido."));

const newPassword = z
  .string({ error: "Escribe una contraseña." })
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
    message: "La contraseña es demasiado larga.",
  });

export const signInSchema = z.object({
  email,
  password: z
    .string({ error: "Escribe tu contraseña." })
    .min(1, "Escribe tu contraseña.")
    .max(1024, "La contraseña es demasiado larga."),
});

export const signUpSchema = z.object({ email, password: newPassword });

export const recoverSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });

export type FieldErrors = Record<string, string>;

/** First message per field, for inline errors. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
