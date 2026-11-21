import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Session cookie hardening. All auth runs on the server, so the cookie never needs to be readable
 * by JavaScript (httpOnly): an injected script cannot steal the session. `secure` only over HTTPS
 * (plain-HTTP local development would otherwise drop the cookie).
 */
export function sessionCookieOptions(isHttps: boolean): CookieOptionsWithName {
  return { httpOnly: true, secure: isHttps, sameSite: "lax", path: "/" };
}
