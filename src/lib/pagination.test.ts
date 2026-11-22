import { describe, expect, it } from "bun:test";
import { pageCount, pageRange, parsePage } from "./pagination";

describe("parsePage", () => {
  it.each([
    { name: "a normal page", value: "3", expected: 3 },
    { name: "the first page", value: "1", expected: 1 },
    { name: "the maximum page", value: "10000", expected: 10000 },
    { name: "zero", value: "0", expected: 1 },
    { name: "above the maximum", value: "10001", expected: 1 },
    { name: "a negative number", value: "-2", expected: 1 },
    { name: "a decimal", value: "2.5", expected: 1 },
    { name: "text", value: "abc", expected: 1 },
    { name: "an injection attempt", value: "1;drop table", expected: 1 },
    { name: "a missing value", value: undefined, expected: 1 },
    { name: "a repeated parameter (array)", value: ["2", "3"], expected: 1 },
  ])("$name → $expected", ({ value, expected }) => {
    expect(parsePage(value)).toBe(expected);
  });
});

describe("pageRange", () => {
  it.each([
    { page: 1, size: 20, expected: { from: 0, to: 19 } },
    { page: 2, size: 20, expected: { from: 20, to: 39 } },
    { page: 3, size: 5, expected: { from: 10, to: 14 } },
  ])("page $page of $size → $expected.from..$expected.to", ({ page, size, expected }) => {
    expect(pageRange(page, size)).toEqual(expected);
  });
});

describe("pageCount", () => {
  it.each([
    { total: 0, expected: 1 },
    { total: 20, expected: 1 },
    { total: 21, expected: 2 },
    { total: 40, expected: 2 },
  ])("$total items in pages of 20 → $expected", ({ total, expected }) => {
    expect(pageCount(total, 20)).toBe(expected);
  });
});
