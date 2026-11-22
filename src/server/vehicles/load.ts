import "server-only";
import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/vehicle";
import { getCurrentAccount } from "@/server/accounts/current-account";
import { getCurrentUser } from "@/server/auth/session";
import { getVehicle } from "@/server/repositories/vehicles";

/** Session + Supabase client + account for dashboard pages. */
export async function loadDashboardContext() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.signIn);
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase, user.id);
  return { user, supabase, account };
}

/** A vehicle of the current account, or 404 (also for malformed ids and other accounts' vehicles). */
export async function loadVehicleOr404(id: string) {
  if (!uuidSchema.safeParse(id).success) notFound();
  const { supabase } = await loadDashboardContext();
  const vehicle = await getVehicle(supabase, id);
  if (!vehicle) notFound();
  return vehicle;
}
