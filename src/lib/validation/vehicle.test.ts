import { describe, expect, it } from "bun:test";
import { fieldErrorsFrom } from "./auth";
import { createVehicleSchema, normalizePlate, uuidSchema, vehicleSchema } from "./vehicle";

const nextYear = new Date().getFullYear() + 1;
const valid = { class: "car", alias: "Mi carro", currentKm: "45000" };

describe("createVehicleSchema", () => {
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
    const r = createVehicleSchema.parse({
      ...valid,
      alias: "  Moto  ",
      brand: " Yamaha ",
      model: "",
      plate: "abc-12d",
    });
    expect(r).toMatchObject({ alias: "Moto", brand: "Yamaha", model: null, plate: "ABC12D" });
  });

  it("requires class, alias and km with Spanish messages", () => {
    const r = createVehicleSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrorsFrom(r.error)).toMatchObject({
        class: "Elige si es carro o moto.",
        alias: "Escribe un nombre para el vehículo.",
        currentKm: "Escribe el kilometraje actual.",
      });
    }
  });

  it("rejects an unknown class", () => {
    expect(createVehicleSchema.safeParse({ ...valid, class: "truck" }).success).toBe(false);
  });

  it("accepts km 0 and 2,000,000; rejects decimals, separators, negatives and above the max", () => {
    expect(createVehicleSchema.safeParse({ ...valid, currentKm: "0" }).success).toBe(true);
    expect(createVehicleSchema.safeParse({ ...valid, currentKm: "2000000" }).success).toBe(true);
    for (const km of ["2000001", "45.000", "45,5", "-1", "abc", ""]) {
      expect(createVehicleSchema.safeParse({ ...valid, currentKm: km }).success, km).toBe(false);
    }
  });

  it("checks the year range 1950..next year", () => {
    expect(createVehicleSchema.safeParse({ ...valid, year: "1950" }).success).toBe(true);
    expect(createVehicleSchema.safeParse({ ...valid, year: String(nextYear) }).success).toBe(true);
    expect(createVehicleSchema.safeParse({ ...valid, year: "1949" }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...valid, year: String(nextYear + 1) }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...valid, year: "20" }).success).toBe(false);
  });

  it("validates the plate length and characters", () => {
    expect(createVehicleSchema.safeParse({ ...valid, plate: "AB12" }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...valid, plate: "ABCD1234" }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...valid, plate: "AB#123" }).success).toBe(false);
  });

  it("limits text lengths", () => {
    expect(createVehicleSchema.safeParse({ ...valid, alias: "a".repeat(51) }).success).toBe(false);
    expect(createVehicleSchema.safeParse({ ...valid, brand: "b".repeat(51) }).success).toBe(false);
  });

  it("ignores fields that are not part of the schema (no mass assignment)", () => {
    const r = createVehicleSchema.parse({ ...valid, account_id: "x", archived_at: "now", created_by: "y" });
    expect(Object.keys(r).sort()).toEqual(["alias", "brand", "class", "currentKm", "model", "plate", "year"]);
  });
});

describe("vehicleSchema (edit)", () => {
  it("does not accept a km field", () => {
    expect("currentKm" in vehicleSchema.parse({ class: "motorcycle", alias: "Moto", currentKm: "1" })).toBe(false);
  });
});

describe("normalizePlate / uuidSchema", () => {
  it("normalizes plates", () => {
    expect(normalizePlate(" abc 123 ")).toBe("ABC123");
  });

  it("validates UUIDs", () => {
    expect(uuidSchema.safeParse("6f1c1f9e-6c5a-4b8e-9a7b-2d3c4e5f6a7b").success).toBe(true);
    expect(uuidSchema.safeParse("1 or 1=1").success).toBe(false);
  });
});
