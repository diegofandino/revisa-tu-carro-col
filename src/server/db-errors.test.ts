import { describe, expect, it } from "bun:test";
import { dbErrorMessage, GENERIC_DB_ERROR, NOT_FOUND_MESSAGE } from "./db-errors";

describe("dbErrorMessage — vehicles and constraints", () => {
  const cases = [
    {
      name: "vehicle limit of 1 (singular)",
      error: { code: "P0001", message: "vehicle_limit_reached", details: "limit=1" },
      expected: "Tu plan permite 1 vehículo activo. Archiva uno o mejora tu plan.",
    },
    {
      name: "vehicle limit of 2 (plural)",
      error: { code: "P0001", message: "vehicle_limit_reached", details: "limit=2" },
      expected: "Tu plan permite 2 vehículos activos. Archiva uno o mejora tu plan.",
    },
    {
      name: "malformed detail is ignored (falls back to 1)",
      error: { code: "P0001", message: "vehicle_limit_reached", details: "limit=<script>,x=1" },
      expected: "Tu plan permite 1 vehículo activo. Archiva uno o mejora tu plan.",
    },
    { name: "vehicle not found", error: { code: "P0001", message: "vehicle_not_found" }, expected: NOT_FOUND_MESSAGE },
    {
      name: "year out of range",
      error: { code: "P0001", message: "year_out_of_range" },
      expected: "El año debe estar entre 1950 y el próximo año.",
    },
    {
      name: "duplicate plate (constraint name is not shown)",
      error: { code: "23505", message: 'duplicate key value violates "vehicles_account_plate_key"' },
      expected: "Ya tienes un vehículo con esa placa.",
    },
    { name: "check constraint", error: { code: "23514" }, expected: "Revisa los datos e inténtalo de nuevo." },
    {
      name: "invalid text representation",
      error: { code: "22P02" },
      expected: "Revisa los datos e inténtalo de nuevo.",
    },
    { name: "permission denied", error: { code: "42501" }, expected: "No tienes permiso para hacer esto." },
  ];

  it.each(cases)("$name", ({ error, expected }) => {
    expect(dbErrorMessage(error)).toBe(expected);
  });
});

describe("dbErrorMessage — never leaks internals", () => {
  const cases = [
    {
      name: "unknown trigger message",
      error: { code: "P0001", message: "internal: relation private.secret does not exist" },
    },
    { name: "prototype key", error: { code: "P0001", message: "__proto__" } },
    { name: "unknown error code", error: { code: "XX000", message: "boom" } },
    { name: "empty error", error: {} },
  ];

  it.each(cases)("$name → generic message", ({ error }) => {
    expect(dbErrorMessage(error)).toBe(GENERIC_DB_ERROR);
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

describe("dbErrorMessage — maintenance rules", () => {
  const cases = [
    {
      name: "mechanical rule without interval",
      error: { code: "P0001", message: "interval_required" },
      expected: "Escribe cada cuántos km, cada cuántos meses, o ambos.",
    },
    {
      name: "legal rule with interval",
      error: { code: "P0001", message: "legal_type_has_no_interval" },
      expected: "SOAT y técnico-mecánica no usan intervalo: se recuerdan por su fecha de vencimiento.",
    },
    {
      name: "type for another vehicle class",
      error: { code: "P0001", message: "type_not_applicable" },
      expected: "Ese mantenimiento no aplica para este tipo de vehículo.",
    },
    {
      name: "unknown maintenance type",
      error: { code: "P0001", message: "maintenance_type_not_found" },
      expected: "Elige un mantenimiento de la lista.",
    },
  ];

  it.each(cases)("$name", ({ error, expected }) => {
    expect(dbErrorMessage(error)).toBe(expected);
  });

  it("uses the caller's message for duplicates (e.g. a second current rule)", () => {
    const duplicate = "Ya tienes una regla vigente para ese mantenimiento.";
    expect(dbErrorMessage({ code: "23505" }, { duplicate })).toBe(duplicate);
  });
});
