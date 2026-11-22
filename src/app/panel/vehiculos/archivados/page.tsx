import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveButton } from "@/components/vehicles/archive-button";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { ARCHIVED_VEHICLES_PAGE_SIZE } from "@/lib/constants/pagination";
import { pageCount, pageRange, parsePage } from "@/lib/pagination";
import { listArchivedVehicles } from "@/server/repositories/vehicles";
import { setArchivedAction } from "@/server/vehicles/actions";
import { loadDashboardContext } from "@/server/vehicles/load";

export const metadata: Metadata = { title: `Vehículos archivados | ${APP_NAME}` };

export default async function ArchivedVehiclesPage({ searchParams }: PageProps<"/panel/vehiculos/archivados">) {
  const page = parsePage((await searchParams).pagina);
  const { supabase } = await loadDashboardContext();
  const { vehicles, total } = await listArchivedVehicles(supabase, pageRange(page, ARCHIVED_VEHICLES_PAGE_SIZE));
  const pages = pageCount(total, ARCHIVED_VEHICLES_PAGE_SIZE);
  const pageHref = (n: number) => `${ROUTES.archivedVehicles}?pagina=${n}`;

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
        <p className="panel-lead">
          {total === 0 ? "No tienes vehículos archivados." : "Esta página no tiene vehículos."}
        </p>
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
      {pages > 1 ? (
        <nav aria-label="Páginas de vehículos archivados" className="pagination">
          {page > 1 ? <Link href={pageHref(page - 1)}>← Anterior</Link> : <span />}
          <span aria-current="page">
            Página {Math.min(page, pages)} de {pages}
          </span>
          {page < pages ? <Link href={pageHref(page + 1)}>Siguiente →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
