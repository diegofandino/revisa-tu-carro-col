import { ROUTES } from "@/constants/routes";

export const vehiclePath = (id: string) => `${ROUTES.vehicles}/${id}`;
export const editVehiclePath = (id: string) => `${ROUTES.vehicles}/${id}/editar`;
export const rulesPath = (id: string) => `${ROUTES.vehicles}/${id}/reglas`;
export const servicesPath = (id: string) => `${ROUTES.vehicles}/${id}/servicios`;
