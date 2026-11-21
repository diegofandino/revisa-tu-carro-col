import { describe, expect, it } from "bun:test";
import { authErrorMessage, GENERIC_AUTH_ERROR, isRateLimit } from "./errors";

describe("authErrorMessage", () => {
  it("keeps sign-in failures generic", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("Correo o contraseña incorrectos.");
  });

  it("maps known codes to Spanish messages", () => {
    expect(authErrorMessage("same_password")).toContain("diferente");
    expect(authErrorMessage("over_request_rate_limit")).toContain("Demasiados intentos");
  });

  it("falls back to a generic message for unknown or missing codes", () => {
    expect(authErrorMessage("unexpected_failure")).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage(undefined)).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage("__proto__")).toBe(GENERIC_AUTH_ERROR);
  });
});

describe("isRateLimit", () => {
  it("detects rate-limit codes", () => {
    expect(isRateLimit("over_email_send_rate_limit")).toBe(true);
    expect(isRateLimit("over_request_rate_limit")).toBe(true);
    expect(isRateLimit("invalid_credentials")).toBe(false);
    expect(isRateLimit(undefined)).toBe(false);
  });
});
