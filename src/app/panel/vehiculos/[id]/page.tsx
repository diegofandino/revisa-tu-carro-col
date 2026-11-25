import type { Metadata } from "next";
import Link from "next/link";
import { DueList } from "@/components/due/due-list";
import { AddReadingForm } from "@/components/readings/add-reading-form";
import { ReadingsHistory } from "@/components/readings/readings-history";
import { ArchiveButton } from "@/components/vehicles/archive-button";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { todayInBogota } from "@/domain/maintenance/dates";
import { formatDate, formatKm } from "@/lib/format";
import { averageLine } from "@/lib/format-due";
import { VEHICLE_CLASS_LABELS } from "@/lib/validation/constants/vehicle";
import { addReadingAction, changeReadingAction } from "@/server/readings/actions";
import { listReadings } from "@/server/repositories/readings";
import { setArchivedAction } from "@/server/vehicles/actions";
import { loadVehicleDue } from "@/server/vehicles/due";
import { loadDashboardContext, loadVehicleOr404 } from "@/server/vehicles/load";
import { editVehiclePath, rulesPath, servicesPath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Vehículo | ${APP_NAME}` };

export default async function VehiclePage({ params }: PageProps<"/panel/vehiculos/[id]">) {
  const { id } = await params;
  const vehicle = await loadVehicleOr404(id);
  const archived = vehicle.archivedAt !== null;
  const { supabase } = await loadDashboardContext();
  const today = todayInBogota();
  const [readings, due] = await Promise.all([
    listReadings(supabase, vehicle.id),
    loadVehicleDue(supabase, vehicle.id, today),
  ]);

  return (
    <>
      <p className="auth-links">
        <Link href={archived ? ROUTES.archivedVehicles : ROUTES.dashboard}>← Volver</Link>
      </p>
      <h1 className="panel-title">{vehicle.alias}</h1>
      {archived ? <p className="notice">Este vehículo está archivado.</p> : null}

      <dl className="data-list">
        <div>
          <dt>Tipo</dt>
          <dd>{VEHICLE_CLASS_LABELS[vehicle.class]}</dd>
        </div>
        <div>
          <dt>Kilometraje actual</dt>
          <dd>
            {vehicle.currentKm !== null && vehicle.lastReadingDate
              ? `${formatKm(vehicle.currentKm)} (${formatDate(vehicle.lastReadingDate)})`
              : "Sin lecturas"}
          </dd>
        </div>
        {vehicle.brand ? (
          <div>
            <dt>Marca</dt>
            <dd>{vehicle.brand}</dd>
          </div>
        ) : null}
        {vehicle.model ? (
          <div>
            <dt>Modelo</dt>
            <dd>{vehicle.model}</dd>
          </div>
        ) : null}
        {vehicle.year ? (
          <div>
            <dt>Año</dt>
            <dd>{vehicle.year}</dd>
          </div>
        ) : null}
        {vehicle.plate ? (
          <div>
            <dt>Placa</dt>
            <dd>{vehicle.plate}</dd>
          </div>
        ) : null}
      </dl>

      <nav aria-label="Secciones del vehículo" className="section-links">
        <Link href={rulesPath(vehicle.id)} className="btn-secondary btn-link">
          Mantenimientos
        </Link>
        <Link href={servicesPath(vehicle.id)} className="btn-secondary btn-link">
          Servicios
        </Link>
      </nav>

      <section aria-labelledby="due-title" className="stack-section">
        <h2 id="due-title" className="section-title">
          Próximos mantenimientos
        </h2>
        {due.items.length === 0 ? (
          <>
            <p className="panel-lead">
              Configura sus mantenimientos (cada cuántos km o meses) para saber cuándo toca cada uno.
            </p>
            <Link href={rulesPath(vehicle.id)} className="btn-primary btn-link">
              Configura sus mantenimientos
            </Link>
          </>
        ) : (
          <>
            <p className="vehicle-card-meta">{averageLine(due.avgKmPerDay)}</p>
            <DueList vehicleId={vehicle.id} items={due.items} canRegister={!archived} />
          </>
        )}
      </section>

      {archived ? null : <AddReadingForm action={addReadingAction.bind(null, vehicle.id)} today={today} />}

      <ReadingsHistory
        readings={readings}
        changeAction={changeReadingAction.bind(null, vehicle.id)}
        today={today}
        editable={!archived}
      />

      <div className="panel-actions">
        {archived ? null : (
          <Link href={editVehiclePath(vehicle.id)} className="btn-secondary btn-link">
            Editar
          </Link>
        )}
        <ArchiveButton
          action={setArchivedAction.bind(null, vehicle.id, !archived)}
          label={archived ? "Desarchivar" : "Archivar"}
          pendingLabel={archived ? "Desarchivando…" : "Archivando…"}
        />
      </div>
    </>
  );
}
