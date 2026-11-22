"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/lib/validation/auth";
import { addReadingSchema, correctReadingSchema, deleteReadingSchema } from "@/lib/validation/reading";
import { uuidSchema } from "@/lib/validation/vehicle";
import { getCurrentAccount } from "@/server/accounts/current-account";
import { getCurrentUser } from "@/server/auth/session";
import { dbErrorMessage, NOT_FOUND_MESSAGE, READING_NOT_FOUND_MESSAGE } from "@/server/db-errors";
import { type FormState, formValues } from "@/server/forms/form-state";
import { addReading, correctReading, deleteReading } from "@/server/repositories/readings";
import { vehiclePath } from "@/server/vehicles/paths";

const INVALID_FIELDS = "Revisa los campos marcados.";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.signIn);
  return user;
}

export async function addReadingAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, ["readingDate", "km"]);
  const parsed = addReadingSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  // Account from the session; the composite FK + RLS reject vehicles of other accounts.
  const account = await getCurrentAccount(supabase, user.id);
  if (!account) return { status: "error", message: "No encontramos tu cuenta. Vuelve a ingresar.", values };

  const result = await addReading(supabase, account.id, vehicleId, parsed.data);
  if (!result.ok) {
    const message = result.error.code === "23503" ? NOT_FOUND_MESSAGE : dbErrorMessage(result.error);
    return { status: "error", message, values };
  }

  revalidatePath(vehiclePath(vehicleId));
  revalidatePath(ROUTES.dashboard);
  return { status: "success", message: "Lectura guardada." };
}

/** One dialog, two submit buttons: intent=correct saves new values, intent=delete removes the reading. */
export async function changeReadingAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, ["readingId", "readingDate", "km", "reason"]);
  const isDelete = formData.get("intent") === "delete";
  const supabase = await createClient();

  let result: Awaited<ReturnType<typeof correctReading>>;
  if (isDelete) {
    const parsed = deleteReadingSchema.safeParse(values);
    if (!parsed.success) {
      return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
    }
    result = await deleteReading(supabase, vehicleId, parsed.data);
  } else {
    const parsed = correctReadingSchema.safeParse(values);
    if (!parsed.success) {
      return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
    }
    result = await correctReading(supabase, vehicleId, parsed.data);
  }
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };
  if (!result.value) return { status: "error", message: READING_NOT_FOUND_MESSAGE, values };

  revalidatePath(vehiclePath(vehicleId));
  revalidatePath(ROUTES.dashboard);
  return { status: "success", message: isDelete ? "Lectura eliminada." : "Lectura corregida." };
}
