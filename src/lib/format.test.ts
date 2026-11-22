import { describe, expect, it } from "bun:test";
import { formatDate, formatInterval, formatKm } from "./format";

describe("formatKm", () => {
  it("uses Colombian thousands separators", () => {
    expect(formatKm(45000)).toBe("45.000 km");
    expect(formatKm(0)).toBe("0 km");
    expect(formatKm(2000000)).toBe("2.000.000 km");
  });
});

describe("formatDate", () => {
  it("formats calendar dates in Spanish without shifting the day", () => {
    expect(formatDate("2026-11-21")).toBe("21 de nov. de 2026");
    expect(formatDate("2026-01-01")).toBe("1 de ene. de 2026");
  });
});

describe("formatInterval", () => {
  it.each([
    {
      name: "km and months",
      kind: "mechanical" as const,
      km: 5000,
      months: 6,
      expected: "Cada 5.000 km o 6 meses (lo que ocurra primero)",
    },
    { name: "km only", kind: "mechanical" as const, km: 40000, months: null, expected: "Cada 40.000 km" },
    { name: "one month (singular)", kind: "mechanical" as const, km: null, months: 1, expected: "Cada 1 mes" },
    { name: "months only", kind: "mechanical" as const, km: null, months: 24, expected: "Cada 24 meses" },
    {
      name: "legal document",
      kind: "legal" as const,
      km: null,
      months: null,
      expected: "Según la fecha de vencimiento del documento",
    },
    {
      name: "mechanical without interval (should not happen)",
      kind: "mechanical" as const,
      km: null,
      months: null,
      expected: "Sin intervalo",
    },
  ])("$name", ({ kind, km, months, expected }) => {
    expect(formatInterval(kind, km, months)).toBe(expected);
  });
});
