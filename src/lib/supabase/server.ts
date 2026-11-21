import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { publicEnv } from "@/lib/env";
import { isHttpsRequest } from "@/lib/security/request";
import { sessionCookieOptions } from "./cookie-options";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new client per request; never store it in a module-level variable.
 * For authorization use `supabase.auth.getClaims()`, never `getSession()`.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const env = publicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions(isHttpsRequest(requestHeaders.get("x-forwarded-proto"), null)),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: safe to ignore because the proxy refreshes sessions.
        }
      },
    },
  });
}
