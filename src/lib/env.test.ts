import { afterEach, describe, expect, it } from "bun:test";
import { parsePublicEnv, publicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_EXAMPLE_NOT_A_REAL_KEY_000000",
};

describe("parsePublicEnv", () => {
  it("accepts valid values", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("rejects missing variables and reports only their names", () => {
    expect(() => parsePublicEnv({})).toThrow(
      "Invalid or missing public environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("rejects a non-http(s) URL", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "javascript:alert(1)" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("does not leak the invalid value in the error message", () => {
    const secretLooking = "short-key";
    let message = "";
    try {
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secretLooking });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(message).not.toContain(secretLooking);
  });
});

describe("publicEnv", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("reads and caches process.env values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = valid.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const first = publicEnv();
    expect(first).toEqual(valid);
    expect(publicEnv()).toBe(first);
  });
});
