import { describe, expect, it } from "bun:test";
import { addDays, addMonths, daysBetween, minDate, todayInBogota } from "./dates";

describe("todayInBogota", () => {
  it("uses Colombian time, not UTC (UTC-5)", () => {
    expect(todayInBogota(new Date("2026-11-18T03:00:00Z"))).toBe("2026-11-17");
    expect(todayInBogota(new Date("2026-11-18T05:00:00Z"))).toBe("2026-11-18");
  });
});

describe("addMonths", () => {
  it("adds calendar months", () => {
    expect(addMonths("2026-06-01", 6)).toBe("2026-12-01");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("clamps to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-08-31", 1)).toBe("2026-09-30");
  });

  it("rejects malformed or impossible dates", () => {
    expect(() => addMonths("2026-02-30", 1)).toThrow(RangeError);
    expect(() => addMonths("18/11/2026", 1)).toThrow(RangeError);
  });
});

describe("addDays / daysBetween", () => {
  it("is exact across month and year boundaries", () => {
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(daysBetween("2026-11-17", "2026-12-01")).toBe(14);
    expect(daysBetween("2026-12-01", "2026-11-17")).toBe(-14);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("minDate", () => {
  it("returns the earliest known date", () => {
    expect(minDate("2026-12-01", "2026-11-30")).toBe("2026-11-30");
    expect(minDate(null, "2026-11-30")).toBe("2026-11-30");
    expect(minDate("2026-12-01", null)).toBe("2026-12-01");
    expect(minDate(null, null)).toBeNull();
  });
});
