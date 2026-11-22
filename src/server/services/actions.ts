"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom } from "@/lib/validation/auth";
import { createServiceSchema, serviceErrorsForKind, voidServiceSchema } from "@/lib/validation/service";
import { uuidSchema } from "@/lib/validation/vehicle";
import { getCurrentAccount } from "@/server/accounts/current-account";
import { getCurrentUser } from "@/server/auth/session";
import { dbErrorMessage, NOT_FOUND_MESSAGE } from "@/server/db-errors";
import { type FormState, formValues } from "@/server/forms/form-state";
import { listMaintenanceTypes } from "@/server/repositories/rules";
import { createService, voidService } from "@/server/repositories/services";
import { getVehicle } from "@/server/repositories/vehicles";
import { servicesPath, vehiclePath } from "@/server/vehicles/paths";

const INVALID_FIELDS = "Revisa los campos marcados.";
const SERVICE_NOT_FOUND = "No encontramos ese servicio.";
const FIELDS = [
  "maintenanceTypeId",
  "serviceDate",
  "km",
  "expiresOn",
  "costCop",
  "workshop",
  "notes",
  "isApproximate",
] as const;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.signIn);
  return user;
}

function refresh(vehicleId: string) {
  revalidatePath(servicesPath(vehicleId));
  revalidatePath(vehiclePath(vehicleId));
  revalidatePath(ROUTES.dashboard);
}

export async function createServiceAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, FIELDS);
  const parsed = createServiceSchema.safeParse(values);
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
  const kindErrors = serviceErrorsForKind(type.kind, parsed.data.km, parsed.data.expiresOn);
  if (kindErrors) return { status: "error", message: INVALID_FIELDS, fieldErrors: kindErrors, values };

  const result = await createService(supabase, account.id, vehicleId, parsed.data);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };

  refresh(vehicleId);
  return { status: "success", message: `Servicio registrado: ${type.name}.` };
}

export async function voidServiceAction(vehicleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  if (!uuidSchema.safeParse(vehicleId).success) return { status: "error", message: NOT_FOUND_MESSAGE };

  const values = formValues(formData, ["serviceId", "reason"]);
  const parsed = voidServiceSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const supabase = await createClient();
  const result = await voidService(supabase, vehicleId, parsed.data);
  if (!result.ok) return { status: "error", message: dbErrorMessage(result.error), values };
  if (!result.value) return { status: "error", message: SERVICE_NOT_FOUND, values };

  refresh(vehicleId);
  return { status: "success", message: "Servicio anulado." };
}
