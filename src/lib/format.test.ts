import { describe, expect, it } from "bun:test";
import { formatDate, formatKm } from "./format";

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
