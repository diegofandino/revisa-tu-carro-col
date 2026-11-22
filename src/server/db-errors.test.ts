import { describe, expect, it } from "bun:test";
import { dbErrorMessage, GENERIC_DB_ERROR, NOT_FOUND_MESSAGE } from "./db-errors";

describe("dbErrorMessage", () => {
  it("explains the vehicle limit with the plan's number", () => {
    expect(dbErrorMessage({ code: "P0001", message: "vehicle_limit_reached", details: "limit=1" })).toBe(
      "Tu plan permite 1 vehículo activo. Archiva uno o mejora tu plan.",
    );
    expect(dbErrorMessage({ code: "P0001", message: "vehicle_limit_reached", details: "limit=2" })).toBe(
      "Tu plan permite 2 vehículos activos. Archiva uno o mejora tu plan.",
    );
  });

  it("ignores malformed or unexpected details", () => {
    expect(
      dbErrorMessage({ code: "P0001", message: "vehicle_limit_reached", details: "limit=<script>,x=1" }),
    ).toContain("1 vehículo");
  });

  it("maps known trigger errors and constraint codes", () => {
    expect(dbErrorMessage({ code: "P0001", message: "vehicle_not_found" })).toBe(NOT_FOUND_MESSAGE);
    expect(dbErrorMessage({ code: "P0001", message: "year_out_of_range" })).toContain("1950");
    expect(
      dbErrorMessage({ code: "23505", message: 'duplicate key value violates "vehicles_account_plate_key"' }),
    ).toBe("Ya tienes un vehículo con esa placa.");
    expect(dbErrorMessage({ code: "23514" })).toBe("Revisa los datos e inténtalo de nuevo.");
    expect(dbErrorMessage({ code: "42501" })).toBe("No tienes permiso para hacer esto.");
  });

  it("never leaks unknown messages", () => {
    const leaky = { code: "P0001", message: "internal: relation private.secret does not exist" };
    expect(dbErrorMessage(leaky)).toBe(GENERIC_DB_ERROR);
    expect(dbErrorMessage({ code: "P0001", message: "__proto__" })).toBe(GENERIC_DB_ERROR);
    expect(dbErrorMessage({ code: "XX000", message: "boom" })).toBe(GENERIC_DB_ERROR);
    expect(dbErrorMessage({})).toBe(GENERIC_DB_ERROR);
  });
});

describe("dbErrorMessage — odometer readings", () => {
  const cases = [
    {
      name: "lower than a previous reading, with the km",
      error: { code: "P0001", message: "reading_lower_than_previous", details: "previous_km=45000" },
      expected: "El kilometraje no puede ser menor que el de una lectura anterior (45.000 km).",
    },
    {
      name: "higher than a later reading, with the km",
      error: { code: "P0001", message: "reading_higher_than_later", details: "later_km=12000" },
      expected: "El kilometraje no puede ser mayor que el de una lectura posterior (12.000 km).",
    },
    {
      name: "not higher than the same day",
      error: { code: "P0001", message: "reading_not_higher_same_day", details: "same_day_km=50500" },
      expected: "Ese día ya tiene una lectura (50.500 km). Solo puedes registrar un valor mayor.",
    },
    {
      name: "missing km detail is omitted, not shown as NaN",
      error: { code: "P0001", message: "reading_lower_than_previous" },
      expected: "El kilometraje no puede ser menor que el de una lectura anterior.",
    },
    {
      name: "future date",
      error: { code: "P0001", message: "date_in_future" },
      expected: "La fecha no puede ser futura.",
    },
    {
      name: "reused correction reason",
      error: { code: "P0001", message: "correction_reason_required" },
      expected: "Escribe un motivo nuevo para esta corrección.",
    },
    {
      name: "deleting the only reading",
      error: { code: "P0001", message: "last_reading" },
      expected: "No puedes eliminar la única lectura del vehículo.",
    },
    {
      name: "editing a service reading",
      error: { code: "P0001", message: "service_reading_immutable" },
      expected: "Esta lectura viene de un servicio. Para corregirla, anula ese servicio.",
    },
    {
      name: "already deleted",
      error: { code: "P0001", message: "reading_deleted" },
      expected: "Esa lectura ya fue eliminada.",
    },
  ];

  it.each(cases)("$name", ({ error, expected }) => {
    expect(dbErrorMessage(error)).toBe(expected);
  });
});
