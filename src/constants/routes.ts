export const ROUTES = {
  home: "/",
  signIn: "/ingresar",
  signUp: "/registro",
  recover: "/recuperar",
  resetPassword: "/restablecer",
  authConfirm: "/auth/confirm",
  dashboard: "/panel",
} as const;

/** Routes that require a session (checked again on the server; the proxy only improves UX). */
export const PROTECTED_PREFIXES = [ROUTES.dashboard, ROUTES.resetPassword] as const;

/** Routes that make no sense with a session (signed-in users go to the dashboard). */
export const GUEST_ONLY_ROUTES = [ROUTES.signIn, ROUTES.signUp, ROUTES.recover] as const;
