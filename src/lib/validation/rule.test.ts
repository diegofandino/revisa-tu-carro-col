import { describe, expect, it } from "bun:test";
import { fieldErrorsFrom } from "./auth";
import { createRuleSchema, intervalErrorsForKind, updateRuleSchema } from "./rule";

const TYPE = "6f1c1f9e-6c5a-4b8e-9a7b-2d3c4e5f6a7b";

describe("createRuleSchema — valid input", () => {
  it.each([
    { name: "km only", input: { intervalKm: "5000" }, expected: { intervalKm: 5000, intervalMonths: null } },
    {
      name: "km with thousands dots",
      input: { intervalKm: "5.000" },
      expected: { intervalKm: 5000, intervalMonths: null },
    },
    { name: "months only", input: { intervalMonths: "6" }, expected: { intervalKm: null, intervalMonths: 6 } },
    {
      name: "both",
      input: { intervalKm: "40000", intervalMonths: "48" },
      expected: { intervalKm: 40000, intervalMonths: 48 },
    },
    { name: "neither (kind decides later)", input: {}, expected: { intervalKm: null, intervalMonths: null } },
    {
      name: "empty strings",
      input: { intervalKm: " ", intervalMonths: "" },
      expected: { intervalKm: null, intervalMonths: null },
    },
    { name: "km minimum 100", input: { intervalKm: "100" }, expected: { intervalKm: 100, intervalMonths: null } },
    {
      name: "km maximum 200,000",
      input: { intervalKm: "200000" },
      expected: { intervalKm: 200000, intervalMonths: null },
    },
    { name: "months boundaries 1", input: { intervalMonths: "1" }, expected: { intervalKm: null, intervalMonths: 1 } },
    {
      name: "months boundaries 120",
      input: { intervalMonths: "120" },
      expected: { intervalKm: null, intervalMonths: 120 },
    },
  ])("accepts $name", ({ input, expected }) => {
    expect(createRuleSchema.parse({ maintenanceTypeId: TYPE, ...input })).toEqual({
      maintenanceTypeId: TYPE,
      ...expected,
    });
  });
});

describe("createRuleSchema — invalid input", () => {
  it.each([
    { name: "km below 100", input: { intervalKm: "99" }, field: "intervalKm" },
    { name: "km above 200,000", input: { intervalKm: "200001" }, field: "intervalKm" },
    { name: "km with decimals", input: { intervalKm: "5000,5" }, field: "intervalKm" },
    { name: "negative km", input: { intervalKm: "-5000" }, field: "intervalKm" },
    { name: "zero months", input: { intervalMonths: "0" }, field: "intervalMonths" },
    { name: "121 months", input: { intervalMonths: "121" }, field: "intervalMonths" },
    { name: "months as text", input: { intervalMonths: "seis" }, field: "intervalMonths" },
    { name: "a type id that is not a UUID", input: { maintenanceTypeId: "oil_change" }, field: "maintenanceTypeId" },
  ])("rejects $name", ({ input, field }) => {
    const result = createRuleSchema.safeParse({ maintenanceTypeId: TYPE, ...input });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrorsFrom(result.error))).toEqual([field]);
  });

  it("explains the km range in Spanish with thousands separators", () => {
    const result = createRuleSchema.safeParse({ maintenanceTypeId: TYPE, intervalKm: "50" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error).intervalKm).toBe("El intervalo en km debe estar entre 100 y 200.000.");
    }
  });
});

describe("updateRuleSchema", () => {
  it("needs a valid rule id", () => {
    expect(updateRuleSchema.safeParse({ ruleId: TYPE, intervalMonths: "6" }).success).toBe(true);
    expect(updateRuleSchema.safeParse({ ruleId: "1 or 1=1", intervalMonths: "6" }).success).toBe(false);
  });
});

describe("intervalErrorsForKind", () => {
  it.each([
    { name: "mechanical with km", kind: "mechanical", km: 5000, months: null, field: null },
    { name: "mechanical with months", kind: "mechanical", km: null, months: 6, field: null },
    { name: "mechanical with both", kind: "mechanical", km: 5000, months: 6, field: null },
    { name: "mechanical with neither", kind: "mechanical", km: null, months: null, field: "intervalKm" },
    { name: "legal with neither", kind: "legal", km: null, months: null, field: null },
    { name: "legal with km", kind: "legal", km: 5000, months: null, field: "intervalKm" },
    { name: "legal with months", kind: "legal", km: null, months: 12, field: "intervalKm" },
  ] as const)("$name", ({ kind, km, months, field }) => {
    const errors = intervalErrorsForKind(kind, km, months);
    expect(errors ? Object.keys(errors) : null).toEqual(field ? [field] : null);
  });
});
