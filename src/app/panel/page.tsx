import type { Metadata } from "next";
import Link from "next/link";
import { DueListCompact } from "@/components/due/due-list";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { todayInBogota } from "@/domain/maintenance/dates";
import { sumCounts } from "@/domain/maintenance/vehicle-due";
import { summaryLine } from "@/lib/format-due";
import { listActiveVehicles } from "@/server/repositories/vehicles";
import { loadVehicleDue } from "@/server/vehicles/due";
import { loadDashboardContext } from "@/server/vehicles/load";
import { vehiclePath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Mis vehículos | ${APP_NAME}` };

/** Most urgent maintenances shown per vehicle card. */
const TOP_ITEMS = 3;

export default async function PanelPage() {
  const { supabase, account } = await loadDashboardContext();
  const vehicles = await listActiveVehicles(supabase);
  const limit = account?.vehicleLimit ?? 0;
  const atLimit = vehicles.length >= limit;
  // Active vehicles are bounded by the plan limit, so one small set of queries per vehicle.
  const today = todayInBogota();
  const dues = await Promise.all(vehicles.map((v) => loadVehicleDue(supabase, v.id, today)));
  const summary = summaryLine(sumCounts(dues.map((d) => d.counts)));

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

      {summary ? (
        <p className="due-summary">
          <span className="visually-hidden">Mantenimientos: </span>
          {summary}
        </p>
      ) : null}

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
          {vehicles.map((vehicle, i) => {
            const due = dues[i];
            const urgent = due.items.filter((item) => item.evaluation.status !== "ok").slice(0, TOP_ITEMS);
            return (
              <VehicleCard key={vehicle.id} vehicle={vehicle}>
                {due.items.length === 0 ? (
                  <p className="vehicle-card-meta">Sin mantenimientos configurados</p>
                ) : urgent.length === 0 ? (
                  <p className="vehicle-card-meta">Mantenimientos al día</p>
                ) : (
                  <DueListCompact items={urgent} />
                )}
                <Link href={vehiclePath(vehicle.id)} className="due-more">
                  Ver todo<span className="visually-hidden"> de {vehicle.alias}</span>
                </Link>
              </VehicleCard>
            );
          })}
        </ul>
      )}

      <p className="auth-links">
        <Link href={ROUTES.archivedVehicles}>Ver vehículos archivados</Link>
      </p>
    </>
  );
}
