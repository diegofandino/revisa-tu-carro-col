import { describe, expect, it } from "bun:test";
import { averageKmPerDay, currentKm } from "./estimate";

const today = "2026-11-17";

describe("averageKmPerDay", () => {
  it("uses the readings of the last 90 days", () => {
    const readings = [
      { date: "2025-01-01", km: 0 }, // outside the window, ignored
      { date: "2026-10-18", km: 20000 },
      { date: "2026-11-17", km: 21500 },
    ];
    expect(averageKmPerDay(readings, today)).toBe(50);
  });

  it("falls back to the whole history when the window has too little data (D2)", () => {
    const readings = [
      { date: "2026-01-01", km: 10000 },
      { date: "2026-11-17", km: 14600 },
    ];
    expect(averageKmPerDay(readings, today)).toBeCloseTo(4600 / 320, 10);
  });

  it("returns null with a single reading (D2)", () => {
    expect(averageKmPerDay([{ date: today, km: 1000 }], today)).toBeNull();
  });

  it("returns null when readings span less than 14 days", () => {
    const readings = [
      { date: "2026-11-04", km: 1000 },
      { date: "2026-11-17", km: 1500 },
    ];
    expect(averageKmPerDay(readings, today)).toBeNull();
  });

  it("accepts exactly 14 days of span", () => {
    const readings = [
      { date: "2026-11-03", km: 1000 },
      { date: "2026-11-17", km: 1700 },
    ];
    expect(averageKmPerDay(readings, today)).toBe(50);
  });

  it("is order-independent and handles several readings on one day", () => {
    const readings = [
      { date: "2026-11-17", km: 2000 },
      { date: "2026-10-18", km: 500 },
      { date: "2026-10-18", km: 400 },
    ];
    expect(averageKmPerDay(readings, today)).toBe(1600 / 30);
  });
});

describe("currentKm", () => {
  it("returns the highest reading, or null without readings", () => {
    expect(
      currentKm([
        { date: "2026-01-01", km: 10 },
        { date: "2026-02-01", km: 30 },
      ]),
    ).toBe(30);
    expect(currentKm([])).toBeNull();
  });
});
