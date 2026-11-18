import { describe, expect, it } from "bun:test";
import { buildCsp, generateNonce } from "./csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `) || d === name);

describe("buildCsp", () => {
  const prod = buildCsp({ nonce: "abc123", isDev: false, isHttps: true, supabaseUrl: "https://example.supabase.co" });
  const prodHttp = buildCsp({ nonce: "abc123", isDev: false, isHttps: false, supabaseUrl: "http://127.0.0.1:54321" });
  const dev = buildCsp({ nonce: "abc123", isDev: true, isHttps: false, supabaseUrl: "http://127.0.0.1:54321" });

  it("uses the nonce and strict-dynamic for scripts without unsafe-eval in production", () => {
    expect(directive(prod, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it("never allows unsafe-inline scripts", () => {
    expect(directive(prod, "script-src")).not.toContain("unsafe-inline");
    expect(directive(dev, "script-src")).not.toContain("unsafe-inline");
  });

  it("allows unsafe-eval only in development", () => {
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
  });

  it("blocks framing, plugins and foreign form targets", () => {
    expect(directive(prod, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, "form-action")).toBe("form-action 'self'");
    expect(directive(prod, "base-uri")).toBe("base-uri 'self'");
  });

  it("limits connections to self and the Supabase origin (https + wss)", () => {
    expect(directive(prod, "connect-src")).toBe(
      "connect-src 'self' https://example.supabase.co wss://example.supabase.co",
    );
    expect(directive(dev, "connect-src")).toBe("connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321");
  });

  it("upgrades insecure requests only in production over HTTPS", () => {
    expect(directive(prod, "upgrade-insecure-requests")).toBeDefined();
    expect(directive(prodHttp, "upgrade-insecure-requests")).toBeUndefined();
    expect(directive(dev, "upgrade-insecure-requests")).toBeUndefined();
  });

  it("uses nonce styles in production and inline styles only in development", () => {
    expect(directive(prod, "style-src")).toBe("style-src 'self' 'nonce-abc123'");
    expect(directive(dev, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });
});

describe("generateNonce", () => {
  it("returns a base64 value of 16 random bytes", () => {
    const nonce = generateNonce();
    expect(Buffer.from(nonce, "base64")).toHaveLength(16);
  });

  it("is different on each call", () => {
    const values = new Set(Array.from({ length: 50 }, generateNonce));
    expect(values.size).toBe(50);
  });
});
