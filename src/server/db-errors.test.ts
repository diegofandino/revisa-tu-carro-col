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
