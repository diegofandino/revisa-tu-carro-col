import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { APP_NAME } from "@/constants/app";
import { updateVehicleAction } from "@/server/vehicles/actions";
import { loadVehicleOr404 } from "@/server/vehicles/load";
import { vehiclePath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Editar vehículo | ${APP_NAME}` };

export default async function EditVehiclePage({ params }: PageProps<"/panel/vehiculos/[id]/editar">) {
  const { id } = await params;
  const vehicle = await loadVehicleOr404(id);
  if (vehicle.archivedAt) notFound();

  return (
    <div className="auth-card">
      <h1 className="auth-title">Editar {vehicle.alias}</h1>
      <VehicleForm
        mode="edit"
        action={updateVehicleAction.bind(null, vehicle.id)}
        defaults={vehicle}
        cancelHref={vehiclePath(vehicle.id)}
      />
    </div>
  );
}
