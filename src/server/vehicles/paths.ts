import { ROUTES } from "@/constants/routes";
import { PRESELECT_TYPE_PARAM } from "@/lib/validation/constants/service";

export const vehiclePath = (id: string) => `${ROUTES.vehicles}/${id}`;
export const editVehiclePath = (id: string) => `${ROUTES.vehicles}/${id}/editar`;
export const rulesPath = (id: string) => `${ROUTES.vehicles}/${id}/reglas`;
export const servicesPath = (id: string) => `${ROUTES.vehicles}/${id}/servicios`;
/** Services page with a maintenance type pre-selected (validated again on that page). */
export const registerServicePath = (id: string, maintenanceTypeId: string) =>
  `${servicesPath(id)}?${PRESELECT_TYPE_PARAM}=${encodeURIComponent(maintenanceTypeId)}`;
