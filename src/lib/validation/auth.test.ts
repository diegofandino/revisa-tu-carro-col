import { describe, expect, it } from "bun:test";
import { fieldErrorsFrom, recoverSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./auth";

describe("signInSchema", () => {
  it("normalizes the email", () => {
    expect(signInSchema.parse({ email: "  Ana@Example.TEST ", password: "x" }).email).toBe("ana@example.test");
  });

  it("requires both fields with Spanish messages", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsFrom(result.error)).toEqual({
        email: "Escribe tu correo.",
        password: "Escribe tu contraseña.",
      });
    }
  });

  it("handles missing form fields (null from FormData)", () => {
    const result = signInSchema.safeParse({ email: null, password: null });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrorsFrom(result.error).email).toBe("Escribe tu correo.");
  });

  it("rejects invalid and overlong emails", () => {
    expect(signInSchema.safeParse({ email: "no-es-correo", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: `${"a".repeat(250)}@x.co`, password: "x" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = { email: "ana@example.test", password: "Segura-2026" };

  it("accepts a valid sign-up", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("enforces the minimum length (boundary 7/8)", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "12345678" }).success).toBe(true);
  });

  it("rejects passwords over 72 bytes, counting multibyte characters", () => {
    const tooLong = "ñ".repeat(37); // 74 bytes
    expect(signUpSchema.safeParse({ ...valid, password: tooLong }).success).toBe(false);
    const fits = "a".repeat(72);
    expect(signUpSchema.safeParse({ ...valid, password: fits }).success).toBe(true);
  });
});

describe("recoverSchema / resetPasswordSchema", () => {
  it("validates the recovery email", () => {
    expect(recoverSchema.safeParse({ email: "ana@example.test" }).success).toBe(true);
    expect(recoverSchema.safeParse({ email: "x" }).success).toBe(false);
  });

  it("validates the new password", () => {
    expect(resetPasswordSchema.safeParse({ password: "Nueva-2026" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "corta" }).success).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("returns one message per failing field", () => {
    const result = signInSchema.safeParse({ email: "x", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrorsFrom(result.error);
      expect(Object.keys(errors).sort()).toEqual(["email", "password"]);
      expect(Object.values(errors).every((m) => typeof m === "string")).toBe(true);
    }
  });
});
