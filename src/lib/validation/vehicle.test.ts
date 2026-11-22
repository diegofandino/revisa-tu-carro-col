import { describe, expect, it } from "bun:test";
import { fieldErrorsFrom } from "./auth";
import { createVehicleSchema, normalizePlate, uuidSchema, vehicleSchema } from "./vehicle";

const nextYear = new Date().getFullYear() + 1;
const valid = { class: "car", alias: "Mi carro", currentKm: "45000" };

describe("createVehicleSchema — valid input", () => {
  it("parses a minimal vehicle; optional fields become null", () => {
    expect(createVehicleSchema.parse(valid)).toEqual({
      class: "car",
      alias: "Mi carro",
      brand: null,
      model: null,
      year: null,
      plate: null,
      currentKm: 45000,
    });
  });

  it("trims text and normalizes the plate like the database", () => {
    const parsed = createVehicleSchema.parse({
      ...valid,
      alias: "  Moto  ",
      brand: " Yamaha ",
      model: "",
      plate: "abc-12d",
    });
    expect(parsed).toMatchObject({ alias: "Moto", brand: "Yamaha", model: null, plate: "ABC12D" });
  });

  it.each([
    { name: "km 0", input: { currentKm: "0" } },
    { name: "km 2,000,000 (maximum)", input: { currentKm: "2000000" } },
    { name: "year 1950 (minimum)", input: { year: "1950" } },
    { name: "next year (maximum)", input: { year: String(nextYear) } },
    { name: "a 5-character plate", input: { plate: "ABC12" } },
    { name: "a 7-character plate", input: { plate: "ABC123D" } },
  ])("accepts $name", ({ input }) => {
    expect(createVehicleSchema.safeParse({ ...valid, ...input }).success).toBe(true);
  });

  it("ignores fields that are not part of the schema (no mass assignment)", () => {
    const parsed = createVehicleSchema.parse({ ...valid, account_id: "x", archived_at: "now", created_by: "y" });
    expect(Object.keys(parsed).sort()).toEqual(["alias", "brand", "class", "currentKm", "model", "plate", "year"]);
  });
});

describe("createVehicleSchema — invalid input", () => {
  it("requires class, alias and km with Spanish messages", () => {
    const result = createVehicleSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error)).toMatchObject({
        class: "Elige si es carro o moto.",
        alias: "Escribe un nombre para el vehículo.",
        currentKm: "Escribe el kilometraje actual.",
      });
    }
  });

  it.each([
    { name: "an unknown class", input: { class: "truck" }, field: "class" },
    { name: "km above the maximum", input: { currentKm: "2000001" }, field: "currentKm" },
    { name: "km with a thousands separator", input: { currentKm: "45.000" }, field: "currentKm" },
    { name: "km with decimals", input: { currentKm: "45,5" }, field: "currentKm" },
    { name: "negative km", input: { currentKm: "-1" }, field: "currentKm" },
    { name: "km as text", input: { currentKm: "abc" }, field: "currentKm" },
    { name: "empty km", input: { currentKm: "" }, field: "currentKm" },
    { name: "year 1949", input: { year: "1949" }, field: "year" },
    { name: "a year after next year", input: { year: String(nextYear + 1) }, field: "year" },
    { name: "a 2-digit year", input: { year: "20" }, field: "year" },
    { name: "a 4-character plate", input: { plate: "AB12" }, field: "plate" },
    { name: "an 8-character plate", input: { plate: "ABCD1234" }, field: "plate" },
    { name: "a plate with symbols", input: { plate: "AB#123" }, field: "plate" },
    { name: "an alias over 50 characters", input: { alias: "a".repeat(51) }, field: "alias" },
    { name: "a brand over 50 characters", input: { brand: "b".repeat(51) }, field: "brand" },
  ])("rejects $name", ({ input, field }) => {
    const result = createVehicleSchema.safeParse({ ...valid, ...input });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrorsFrom(result.error))).toEqual([field]);
  });
});

describe("vehicleSchema (edit)", () => {
  it("does not accept a km field", () => {
    expect("currentKm" in vehicleSchema.parse({ class: "motorcycle", alias: "Moto", currentKm: "1" })).toBe(false);
  });
});

describe("normalizePlate", () => {
  it.each([
    { input: " abc 123 ", expected: "ABC123" },
    { input: "abc-12d", expected: "ABC12D" },
    { input: "ABC123", expected: "ABC123" },
  ])("'$input' → '$expected'", ({ input, expected }) => {
    expect(normalizePlate(input)).toBe(expected);
  });
});

describe("uuidSchema", () => {
  it.each([
    { input: "6f1c1f9e-6c5a-4b8e-9a7b-2d3c4e5f6a7b", expected: true },
    { input: "1 or 1=1", expected: false },
    { input: "", expected: false },
  ])("'$input' → $expected", ({ input, expected }) => {
    expect(uuidSchema.safeParse(input).success).toBe(expected);
  });
});
