import { describe, expect, it } from "bun:test";
import { addDays, todayInBogota } from "@/domain/maintenance/dates";
import { fieldErrorsFrom } from "./auth";
import { createServiceSchema, serviceErrorsForKind, voidServiceSchema } from "./service";

const TYPE = "6f1c1f9e-6c5a-4b8e-9a7b-2d3c4e5f6a7b";
const today = todayInBogota();
const base = { maintenanceTypeId: TYPE, serviceDate: "2026-06-01" };

describe("createServiceSchema — valid input", () => {
  it("parses a minimal service; optional fields become null/false", () => {
    expect(createServiceSchema.parse(base)).toEqual({
      ...base,
      km: null,
      expiresOn: null,
      costCop: null,
      workshop: null,
      notes: null,
      isApproximate: false,
    });
  });

  it.each([
    { name: "km with dots", input: { km: "20.000" }, expected: { km: 20000 } },
    { name: "km without dots", input: { km: "20000" }, expected: { km: 20000 } },
    { name: "cost with dots", input: { costCop: "150.000" }, expected: { costCop: 150000 } },
    { name: "cost 0", input: { costCop: "0" }, expected: { costCop: 0 } },
    { name: "cost maximum", input: { costCop: "1.000.000.000" }, expected: { costCop: 1_000_000_000 } },
    { name: "trimmed workshop", input: { workshop: "  Taller Central " }, expected: { workshop: "Taller Central" } },
    { name: "blank notes → null", input: { notes: "   " }, expected: { notes: null } },
    { name: "approximate checkbox", input: { isApproximate: "on" }, expected: { isApproximate: true } },
    { name: "expiry on the service date", input: { expiresOn: "2026-06-01" }, expected: { expiresOn: "2026-06-01" } },
    {
      name: "expiry exactly 10 years later",
      input: { expiresOn: "2036-06-01" },
      expected: { expiresOn: "2036-06-01" },
    },
    { name: "service today", input: { serviceDate: today }, expected: { serviceDate: today } },
  ])("accepts $name", ({ input, expected }) => {
    expect(createServiceSchema.parse({ ...base, ...input })).toMatchObject(expected);
  });
});

describe("createServiceSchema — invalid input", () => {
  it.each([
    { name: "a future service date", input: { serviceDate: addDays(today, 1) }, field: "serviceDate" },
    { name: "a date before 1950", input: { serviceDate: "1949-12-31" }, field: "serviceDate" },
    { name: "an impossible date", input: { serviceDate: "2026-02-30" }, field: "serviceDate" },
    { name: "km above the maximum", input: { km: "2000001" }, field: "km" },
    { name: "km with decimals", input: { km: "20000,5" }, field: "km" },
    { name: "badly grouped thousands", input: { costCop: "1.50.000" }, field: "costCop" },
    { name: "cost above the maximum", input: { costCop: "1000000001" }, field: "costCop" },
    { name: "negative cost", input: { costCop: "-5" }, field: "costCop" },
    { name: "expiry before the service", input: { expiresOn: "2026-05-31" }, field: "expiresOn" },
    { name: "expiry more than 10 years later", input: { expiresOn: "2036-06-02" }, field: "expiresOn" },
    { name: "an invalid expiry date", input: { expiresOn: "2026-13-01" }, field: "expiresOn" },
    { name: "a workshop over 100 characters", input: { workshop: "t".repeat(101) }, field: "workshop" },
    { name: "notes over 1,000 characters", input: { notes: "n".repeat(1001) }, field: "notes" },
    { name: "a type id that is not a UUID", input: { maintenanceTypeId: "soat" }, field: "maintenanceTypeId" },
  ])("rejects $name", ({ input, field }) => {
    const result = createServiceSchema.safeParse({ ...base, ...input });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrorsFrom(result.error))).toEqual([field]);
  });
});

describe("serviceErrorsForKind", () => {
  it.each([
    { name: "mechanical with km", kind: "mechanical", km: 20000, expiresOn: null, field: null },
    { name: "mechanical without km", kind: "mechanical", km: null, expiresOn: null, field: "km" },
    { name: "mechanical with expiry", kind: "mechanical", km: 20000, expiresOn: "2027-01-01", field: "expiresOn" },
    { name: "legal with expiry", kind: "legal", km: null, expiresOn: "2027-01-01", field: null },
    { name: "legal with expiry and km", kind: "legal", km: 20000, expiresOn: "2027-01-01", field: null },
    { name: "legal without expiry", kind: "legal", km: null, expiresOn: null, field: "expiresOn" },
  ] as const)("$name", ({ kind, km, expiresOn, field }) => {
    const errors = serviceErrorsForKind(kind, km, expiresOn);
    expect(errors ? Object.keys(errors) : null).toEqual(field ? [field] : null);
  });
});

describe("voidServiceSchema", () => {
  it.each([
    { name: "valid", input: { serviceId: TYPE, reason: "Registro equivocado" }, ok: true },
    { name: "short reason", input: { serviceId: TYPE, reason: "mal" }, ok: false },
    { name: "missing reason", input: { serviceId: TYPE }, ok: false },
    { name: "tampered id", input: { serviceId: "1 or 1=1", reason: "Registro equivocado" }, ok: false },
  ])("$name → $ok", ({ input, ok }) => {
    expect(voidServiceSchema.safeParse(input).success).toBe(ok);
  });
});
