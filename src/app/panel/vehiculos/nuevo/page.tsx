import type { Metadata } from "next";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { createVehicleAction } from "@/server/vehicles/actions";

export const metadata: Metadata = { title: `Agregar vehículo | ${APP_NAME}` };

export default function NewVehiclePage() {
  return (
    <div className="auth-card">
      <h1 className="auth-title">Agregar vehículo</h1>
      <VehicleForm mode="create" action={createVehicleAction} cancelHref={ROUTES.dashboard} />
    </div>
  );
}
