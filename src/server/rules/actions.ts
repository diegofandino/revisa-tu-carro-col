"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/lib/validation/auth";
import { createRuleSchema, intervalErrorsForKind, updateRuleSchema } from "@/lib/validation/rule";
import { uuidSchema } from "@/lib/validation/vehicle";
import { getCurrentAccount } from "@/server/accounts/current-account";
import { getCurrentUser } from "@/server/auth/session";
import { dbErrorMessage, NOT_FOUND_MESSAGE } from "@/server/db-errors";
import { type FormState, formValues } from "@/server/forms/form-state";
import {
  archiveRule,
  createRule,
  getRuleKind,
  listMaintenanceTypes,
  updateRuleIntervals,
} from "@/server/repositories/rules";
import { getVehicle } from "@/server/repositories/vehicles";
import { rulesPath } from "@/server/vehicles/paths";

const INVALID_FIELDS = "Revisa los campos marcados.";
const RULE_NOT_FOUND = "No encontramos esa regla.";
const DUPLICATE_RULE = "Ya tienes una regla vigente para ese mantenimiento. Edítala en la lista.";
const FIELDS = ["maintenanceTypeId", "intervalKm", "intervalMonths", "ruleId"] as const;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.signIn);
  return user;
}

function refresh(vehicleId: string) {
  revalidatePath(rulesPath(vehicleId));
  revalidatePath(ROUTES.dashboard);
}

export async function createRuleAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, FIELDS);
  const parsed = createRuleSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  const [account, vehicle, types] = await Promise.all([
    getCurrentAccount(supabase, user.id),
    getVehicle(supabase, vehicleId),
    listMaintenanceTypes(supabase),
  ]);
  if (!account || !vehicle) return { status: "error", message: NOT_FOUND_MESSAGE, values };

  const type = types.find((t) => t.id === parsed.data.maintenanceTypeId);
  if (!type?.appliesTo.includes(vehicle.class)) {
    return {
      status: "error",
      message: INVALID_FIELDS,
      fieldErrors: { maintenanceTypeId: "Ese mantenimiento no aplica para este tipo de vehículo." },
      values,
    };
  }
  const kindErrors = intervalErrorsForKind(type.kind, parsed.data.intervalKm, parsed.data.intervalMonths);
  if (kindErrors) return { status: "error", message: INVALID_FIELDS, fieldErrors: kindErrors, values };

  const result = await createRule(supabase, account.id, vehicleId, parsed.data);
  if (!result.ok) {
    return { status: "error", message: dbErrorMessage(result.error, { duplicate: DUPLICATE_RULE }), values };
  }

  refresh(vehicleId);
  return { status: "success", message: `Regla agregada: ${type.name}.` };
}

export async function updateRuleAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, FIELDS);
  const parsed = updateRuleSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  const kind = await getRuleKind(supabase, vehicleId, parsed.data.ruleId);
  if (!kind) return { status: "error", message: RULE_NOT_FOUND, values };
  const kindErrors = intervalErrorsForKind(kind, parsed.data.intervalKm, parsed.data.intervalMonths);
  if (kindErrors) return { status: "error", message: INVALID_FIELDS, fieldErrors: kindErrors, values };

  const result = await updateRuleIntervals(supabase, vehicleId, parsed.data);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };
  if (!result.value) return { status: "error", message: RULE_NOT_FOUND, values };

  refresh(vehicleId);
  return { status: "success", message: "Regla actualizada." };
}

export async function archiveRuleAction(
  vehicleId: string,
  ruleId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success || !uuidSchema.safeParse(ruleId).success) {
    return { status: "error", message: RULE_NOT_FOUND };
  }

  const supabase = await createClient();
  const result = await archiveRule(supabase, vehicleId, ruleId);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error) };
  if (!result.value) return { status: "error", message: RULE_NOT_FOUND };

  refresh(vehicleId);
  return { status: "success", message: "Regla archivada." };
}
