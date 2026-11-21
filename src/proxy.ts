import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { routeRedirect } from "@/lib/routing/route-redirect";
import { buildCsp, generateNonce } from "@/lib/security/csp";
import { isHttpsRequest } from "@/lib/security/request";
import { sessionCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Runs before each matched request:
 * 1. Generates a per-request CSP nonce (Next.js applies it to its own scripts).
 * 2. Refreshes the Supabase session cookie (pattern from the official Next.js + Supabase example).
 * 3. Redirects between guest and protected routes (UX only; pages, Server Actions and RLS
 *    re-check authorization, never only here).
 */
export async function proxy(request: NextRequest) {
  const env = publicEnv();
  const nonce = generateNonce();
  const isHttps = isHttpsRequest(request.headers.get("x-forwarded-proto"), request.nextUrl.protocol);
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    isHttps,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  });

  const nextWithHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = nextWithHeaders();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions(isHttps),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = nextWithHeaders();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // UX redirects only: pages and Server Actions re-check the session, and RLS protects the data.
  const redirectTo = routeRedirect(request.nextUrl.pathname, request.nextUrl.search, signedIn);
  if (redirectTo) {
    const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
