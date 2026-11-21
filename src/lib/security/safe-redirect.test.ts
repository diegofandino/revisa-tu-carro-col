import { describe, expect, it } from "bun:test";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/panel")).toBe("/panel");
    expect(safeNextPath("/panel/vehiculos?tab=historial#x")).toBe("/panel/vehiculos?tab=historial#x");
  });

  it.each([
    ["absolute URL", "https://evil.example/panel"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path", "panel"],
    ["tab trick", "/\t/evil.example"],
    ["newline", "/panel\n"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe("/panel");
  });

  it("rejects non-strings and overly long values", () => {
    expect(safeNextPath(null)).toBe("/panel");
    expect(safeNextPath(42)).toBe("/panel");
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBe("/panel");
  });

  it("normalizes dot segments without leaving the origin", () => {
    expect(safeNextPath("/a/../../panel")).toBe("/panel");
  });

  it("uses the provided fallback", () => {
    expect(safeNextPath("https://evil.example", "/ingresar")).toBe("/ingresar");
  });
});
