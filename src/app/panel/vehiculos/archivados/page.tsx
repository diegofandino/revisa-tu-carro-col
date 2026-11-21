import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveButton } from "@/components/vehicles/archive-button";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { listVehicles } from "@/server/repositories/vehicles";
import { setArchivedAction } from "@/server/vehicles/actions";
import { loadDashboardContext } from "@/server/vehicles/load";

export const metadata: Metadata = { title: `Vehículos archivados | ${APP_NAME}` };

export default async function ArchivedVehiclesPage() {
  const { supabase } = await loadDashboardContext();
  const vehicles = await listVehicles(supabase, { archived: true });

  return (
    <>
      <p className="auth-links">
        <Link href={ROUTES.dashboard}>← Volver</Link>
      </p>
      <h1 className="panel-title">Vehículos archivados</h1>
      <p className="panel-lead">
        Los vehículos archivados conservan su historial y no cuentan para el límite de tu plan.
      </p>
      {vehicles.length === 0 ? (
        <p className="panel-lead">No tienes vehículos archivados.</p>
      ) : (
        <ul className="vehicle-list">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              actions={
                <ArchiveButton
                  action={setArchivedAction.bind(null, vehicle.id, false)}
                  label="Desarchivar"
                  pendingLabel="Desarchivando…"
                />
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
