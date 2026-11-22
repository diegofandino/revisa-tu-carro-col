import { describe, expect, it } from "bun:test";
import { authErrorMessage, GENERIC_AUTH_ERROR, isRateLimit } from "./errors";

describe("authErrorMessage", () => {
  const cases = [
    {
      name: "wrong credentials stay generic",
      code: "invalid_credentials",
      expected: "Correo o contraseña incorrectos.",
    },
    {
      name: "same password",
      code: "same_password",
      expected: "La nueva contraseña debe ser diferente a la anterior.",
    },
    {
      name: "request rate limit",
      code: "over_request_rate_limit",
      expected: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    },
    { name: "unknown code", code: "unexpected_failure", expected: GENERIC_AUTH_ERROR },
    { name: "missing code", code: undefined, expected: GENERIC_AUTH_ERROR },
    { name: "prototype key", code: "__proto__", expected: GENERIC_AUTH_ERROR },
  ];

  it.each(cases)("$name", ({ code, expected }) => {
    expect(authErrorMessage(code)).toBe(expected);
  });
});

describe("isRateLimit", () => {
  const cases = [
    { code: "over_email_send_rate_limit", expected: true },
    { code: "over_request_rate_limit", expected: true },
    { code: "invalid_credentials", expected: false },
    { code: undefined, expected: false },
  ];

  it.each(cases)("$code → $expected", ({ code, expected }) => {
    expect(isRateLimit(code)).toBe(expected);
  });
});
