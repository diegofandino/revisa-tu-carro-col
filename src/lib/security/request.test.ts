import { describe, expect, it } from "bun:test";
import { sessionCookieOptions } from "../supabase/cookie-options";
import { isHttpsRequest } from "./request";

describe("isHttpsRequest", () => {
  it("prefers x-forwarded-proto (first hop) over the URL protocol", () => {
    expect(isHttpsRequest("https", "http:")).toBe(true);
    expect(isHttpsRequest("https, http", "http:")).toBe(true);
    expect(isHttpsRequest("http", "https:")).toBe(false);
    expect(isHttpsRequest("HTTPS", null)).toBe(true);
  });

  it("falls back to the URL protocol", () => {
    expect(isHttpsRequest(null, "https:")).toBe(true);
    expect(isHttpsRequest(null, "http:")).toBe(false);
    expect(isHttpsRequest("", null)).toBe(false);
  });
});

describe("sessionCookieOptions", () => {
  it("is never readable by JavaScript and is lax same-site", () => {
    expect(sessionCookieOptions(false)).toEqual({ httpOnly: true, secure: false, sameSite: "lax", path: "/" });
  });

  it("is secure over HTTPS", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
  });
});
