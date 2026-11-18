import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { buildCsp, generateNonce } from "@/lib/security/csp";

/**
 * Runs before each matched request:
 * 1. Generates a per-request CSP nonce (Next.js applies it to its own scripts).
 * 2. Refreshes the Supabase session cookie (pattern from the official Next.js + Supabase example).
 * Route protection (redirect to login) is added with the auth task; authorization is always
 * re-checked on the server and by RLS, never only here.
 */
export async function proxy(request: NextRequest) {
  const env = publicEnv();
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    // Behind a TLS-terminating proxy (e.g. Vercel) the original scheme arrives in x-forwarded-proto.
    isHttps: (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) === "https",
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
  await supabase.auth.getClaims();

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
