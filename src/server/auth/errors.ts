/**
 * Maps Supabase Auth error codes to user-facing Spanish messages. Never echoes the raw error,
 * and sign-in failures stay generic so they don't reveal whether an account exists.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  over_email_send_rate_limit: "Ya enviamos varios correos. Espera unos minutos e inténtalo de nuevo.",
  weak_password: "Esa contraseña es muy débil. Usa una más larga o difícil de adivinar.",
  same_password: "La nueva contraseña debe ser diferente a la anterior.",
  signup_disabled: "El registro no está disponible por ahora.",
  session_not_found: "Tu sesión expiró. Solicita un nuevo enlace.",
};

export const GENERIC_AUTH_ERROR = "No pudimos completar la operación. Inténtalo de nuevo.";

export function authErrorMessage(code: string | undefined): string {
  return code !== undefined && Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : GENERIC_AUTH_ERROR;
}

export function isRateLimit(code: string | undefined): boolean {
  return code === "over_request_rate_limit" || code === "over_email_send_rate_limit";
}
