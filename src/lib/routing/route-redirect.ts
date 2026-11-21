import { GUEST_ONLY_ROUTES, PROTECTED_PREFIXES, ROUTES } from "@/constants/routes";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Where the proxy should send the user, or null to continue. UX only: never the security boundary. */
export function routeRedirect(pathname: string, search: string, signedIn: boolean): string | null {
  if (!signedIn && PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
    if (matchesPrefix(pathname, ROUTES.resetPassword)) return ROUTES.recover;
    return `${ROUTES.signIn}?next=${encodeURIComponent(pathname + search)}`;
  }
  if (signedIn && GUEST_ONLY_ROUTES.some((p) => matchesPrefix(pathname, p))) return ROUTES.dashboard;
  return null;
}
