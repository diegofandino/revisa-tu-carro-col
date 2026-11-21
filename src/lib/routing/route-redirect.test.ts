import { describe, expect, it } from "bun:test";
import { routeRedirect } from "./route-redirect";

describe("routeRedirect", () => {
  it("sends guests from protected routes to sign-in, keeping where they were going", () => {
    expect(routeRedirect("/panel", "", false)).toBe("/ingresar?next=%2Fpanel");
    expect(routeRedirect("/panel/vehiculos", "?tab=1", false)).toBe("/ingresar?next=%2Fpanel%2Fvehiculos%3Ftab%3D1");
  });

  it("sends guests without a recovery session from the reset page to recovery", () => {
    expect(routeRedirect("/restablecer", "", false)).toBe("/recuperar");
  });

  it("sends signed-in users away from guest-only pages", () => {
    expect(routeRedirect("/ingresar", "", true)).toBe("/panel");
    expect(routeRedirect("/registro", "", true)).toBe("/panel");
    expect(routeRedirect("/recuperar", "", true)).toBe("/panel");
  });

  it("lets everything else through", () => {
    expect(routeRedirect("/", "", false)).toBeNull();
    expect(routeRedirect("/panel", "", true)).toBeNull();
    expect(routeRedirect("/restablecer", "", true)).toBeNull();
    expect(routeRedirect("/ingresar", "", false)).toBeNull();
    expect(routeRedirect("/auth/confirm", "?token_hash=x", false)).toBeNull();
  });

  it("matches whole path segments only", () => {
    expect(routeRedirect("/panelista", "", false)).toBeNull();
    expect(routeRedirect("/ingresarx", "", true)).toBeNull();
  });
});
