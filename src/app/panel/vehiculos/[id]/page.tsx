import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveButton } from "@/components/vehicles/archive-button";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { formatDate, formatKm } from "@/lib/format";
import { VEHICLE_CLASS_LABELS } from "@/lib/validation/constants/vehicle";
import { setArchivedAction } from "@/server/vehicles/actions";
import { loadVehicleOr404 } from "@/server/vehicles/load";
import { editVehiclePath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Vehículo | ${APP_NAME}` };

export default async function VehiclePage({ params }: PageProps<"/panel/vehiculos/[id]">) {
  const { id } = await params;
  const vehicle = await loadVehicleOr404(id);
  const archived = vehicle.archivedAt !== null;

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
