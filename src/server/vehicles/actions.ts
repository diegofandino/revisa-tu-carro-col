"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/lib/validation/auth";
import { createVehicleSchema, uuidSchema, vehicleSchema } from "@/lib/validation/vehicle";
import { getCurrentAccount } from "@/server/accounts/current-account";
import { getCurrentUser } from "@/server/auth/session";
import { dbErrorMessage, NOT_FOUND_MESSAGE } from "@/server/db-errors";
import { type FormState, formValues } from "@/server/forms/form-state";
import { createVehicle, setVehicleArchived, updateVehicle } from "@/server/repositories/vehicles";
import { vehiclePath } from "./paths";

const VEHICLE_FIELDS = ["class", "alias", "brand", "model", "year", "plate", "currentKm"] as const;
const INVALID_FIELDS = "Revisa los campos marcados.";

function raw(formData: FormData) {
  const values = formValues(formData, VEHICLE_FIELDS);
  return { ...values, class: values.class };
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.signIn);
  return user;
}

export async function createVehicleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = raw(formData);
  const parsed = createVehicleSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  // The account always comes from the session, never from the submitted form.
  const account = await getCurrentAccount(supabase, user.id);
  if (!account) return { status: "error", message: "No encontramos tu cuenta. Vuelve a ingresar.", values };

  const result = await createVehicle(supabase, account.id, parsed.data);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };

  revalidatePath(ROUTES.dashboard);
  redirect(vehiclePath(result.value));
}

export async function updateVehicleAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = raw(formData);
  const parsed = vehicleSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  const result = await updateVehicle(supabase, vehicleId, parsed.data);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };
  if (!result.value) return { status: "error", message: NOT_FOUND_MESSAGE, values };

  revalidatePath(ROUTES.dashboard);
  redirect(vehiclePath(vehicleId));
}

export async function setArchivedAction(
  vehicleId: string,
  archived: boolean,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const supabase = await createClient();
  const result = await setVehicleArchived(supabase, vehicleId, archived);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error) };
  if (!result.value) return { status: "error", message: NOT_FOUND_MESSAGE };

  revalidatePath(ROUTES.dashboard);
  redirect(archived ? ROUTES.dashboard : vehiclePath(vehicleId));
}
