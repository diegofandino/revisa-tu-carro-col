import type { Metadata } from "next";
import Link from "next/link";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { listVehicles } from "@/server/repositories/vehicles";
import { loadDashboardContext } from "@/server/vehicles/load";

export const metadata: Metadata = { title: `Mis vehículos | ${APP_NAME}` };

export default async function PanelPage() {
  const { supabase, account } = await loadDashboardContext();
  const vehicles = await listVehicles(supabase, { archived: false });
  const limit = account?.vehicleLimit ?? 0;
  const atLimit = vehicles.length >= limit;

  return (
    <>
      <div className="panel-heading">
        <h1 className="panel-title">Mis vehículos</h1>
        {atLimit ? null : (
          <Link href={ROUTES.newVehicle} className="btn-primary btn-link">
            Agregar vehículo
          </Link>
        )}
      </div>

      {atLimit ? (
        <p className="notice">
          Tu plan permite {limit} vehículo{limit === 1 ? "" : "s"} activo{limit === 1 ? "" : "s"}. Para agregar otro,
          archiva uno o mejora tu plan.
        </p>
      ) : null}

      {vehicles.length === 0 ? (
        <p className="panel-lead">Agrega tu primer vehículo para empezar a llevar su mantenimiento.</p>
      ) : (
        <ul className="vehicle-list">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </ul>
      )}

      <p className="auth-links">
        <Link href={ROUTES.archivedVehicles}>Ver vehículos archivados</Link>
      </p>
    </>
  );
}
