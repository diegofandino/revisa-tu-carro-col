import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CurrentAccount {
  id: string;
  vehicleLimit: number;
}

/**
 * The signed-in user's account (one per user in the MVP). Resolved on the server from the session;
 * never taken from client input. RLS only returns the caller's own rows.
 */
export async function getCurrentAccount(supabase: SupabaseClient, userId: string): Promise<CurrentAccount | null> {
  const { data: membership } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: entitlement } = await supabase
    .from("account_entitlements")
    .select("vehicle_limit")
    .eq("account_id", membership.account_id)
    .maybeSingle();

  return { id: membership.account_id, vehicleLimit: entitlement?.vehicle_limit ?? 0 };
}
