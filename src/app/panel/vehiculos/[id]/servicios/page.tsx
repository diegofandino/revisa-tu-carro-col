import type { Metadata } from "next";
import Link from "next/link";
import { AddServiceForm } from "@/components/services/add-service-form";
import { ServicesHistory } from "@/components/services/services-history";
import { APP_NAME } from "@/constants/app";
import { todayInBogota } from "@/domain/maintenance/dates";
import { listMaintenanceTypes } from "@/server/repositories/rules";
import { listServices } from "@/server/repositories/services";
import { createServiceAction, voidServiceAction } from "@/server/services/actions";
import { loadDashboardContext, loadVehicleOr404 } from "@/server/vehicles/load";
import { vehiclePath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Servicios | ${APP_NAME}` };

export default async function ServicesPage({ params }: PageProps<"/panel/vehiculos/[id]/servicios">) {
  const { id } = await params;
  const vehicle = await loadVehicleOr404(id);
  const archived = vehicle.archivedAt !== null;
  const { supabase } = await loadDashboardContext();
  const [services, types] = await Promise.all([listServices(supabase, vehicle.id), listMaintenanceTypes(supabase)]);
  const options = types
    .filter((t) => t.appliesTo.includes(vehicle.class))
    .map((t) => ({ id: t.id, name: t.name, kind: t.kind }));

  return (
    <>
      <p className="auth-links">
        <Link href={vehiclePath(vehicle.id)}>← {vehicle.alias}</Link>
      </p>
      <h1 className="panel-title">Servicios de {vehicle.alias}</h1>
      <p className="panel-lead">
        Registra cada mantenimiento que le hagas. Los servicios no se editan: si te equivocas, anúlalo y regístralo de
        nuevo.
      </p>

      {archived ? (
        <p className="notice">Desarchiva el vehículo para registrar servicios.</p>
      ) : (
        <AddServiceForm action={createServiceAction.bind(null, vehicle.id)} options={options} today={todayInBogota()} />
      )}

      <ServicesHistory services={services} voidAction={voidServiceAction.bind(null, vehicle.id)} editable={!archived} />
    </>
  );
}
