import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** Verified user from the session JWT (`getClaims` validates it; never use `getSession` for this). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
}
