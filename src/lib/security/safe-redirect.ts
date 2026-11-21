import { ROUTES } from "@/constants/routes";

const PLACEHOLDER_ORIGIN = "https://app.invalid";

/**
 * Returns a same-origin path to redirect to, or the fallback. Prevents open redirects
 * (`https://evil.example`, `//evil.example`, `/\evil.example`, `javascript:`…).
 */
export function safeNextPath(value: unknown, fallback: string = ROUTES.dashboard): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  // Reject control characters (e.g. tab/newline tricks that browsers strip).
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20 || value.charCodeAt(i) === 0x7f) return fallback;
  }
  // A path starting with a single "/" always parses against the base, so this cannot throw.
  const url = new URL(value, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
