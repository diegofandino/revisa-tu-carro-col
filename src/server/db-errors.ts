/** Minimal shape of PostgREST/Postgres errors returned by supabase-js. */
export interface DbError {
  code?: string;
  message?: string;
  details?: string | null;
}

export const GENERIC_DB_ERROR = "No pudimos guardar los cambios. Inténtalo de nuevo.";
export const NOT_FOUND_MESSAGE = "No encontramos ese vehículo.";

const P0001_MESSAGES: Record<string, (detail: Record<string, string>) => string> = {
  vehicle_limit_reached: (d) =>
    `Tu plan permite ${d.limit ?? "1"} vehículo${d.limit === "1" || !d.limit ? "" : "s"} activo${d.limit === "1" || !d.limit ? "" : "s"}. Archiva uno o mejora tu plan.`,
  year_out_of_range: () => "El año debe estar entre 1950 y el próximo año.",
  vehicle_not_found: () => NOT_FOUND_MESSAGE,
  immutable_column: () => "Ese dato no se puede cambiar.",
};

/** Parses trigger details like "limit=1" or "previous_km=45000". */
function parseDetail(details: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of (details ?? "").split(",")) {
    const [key, value] = part.split("=");
    if (key && value !== undefined && /^[a-z_]+$/.test(key.trim()) && /^\d+$/.test(value.trim())) {
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

/**
 * Maps database errors to user-facing Spanish messages. Only known, safe information is shown:
 * never raw messages, SQL, constraint names or internal ids.
 */
export function dbErrorMessage(error: DbError): string {
  switch (error.code) {
    case "P0001": {
      const key = error.message ?? "";
      return Object.hasOwn(P0001_MESSAGES, key) ? P0001_MESSAGES[key](parseDetail(error.details)) : GENERIC_DB_ERROR;
    }
    case "23505":
      return "Ya tienes un vehículo con esa placa.";
    case "23514":
    case "22P02":
      return "Revisa los datos e inténtalo de nuevo.";
    case "42501":
      return "No tienes permiso para hacer esto.";
    default:
      return GENERIC_DB_ERROR;
  }
}
