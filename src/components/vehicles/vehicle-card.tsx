import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, formatKm } from "@/lib/format";
import { VEHICLE_CLASS_LABELS } from "@/lib/validation/constants/vehicle";
import type { VehicleSummary } from "@/server/repositories/vehicles";
import { vehiclePath } from "@/server/vehicles/paths";

interface VehicleCardProps {
  vehicle: VehicleSummary;
  /** Extra content under the km (e.g. upcoming maintenances on the dashboard). */
  children?: ReactNode;
  actions?: ReactNode;
}

export function VehicleCard({ vehicle, children, actions }: VehicleCardProps) {
  const details = [VEHICLE_CLASS_LABELS[vehicle.class], vehicle.brand, vehicle.model, vehicle.year]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="vehicle-card">
      <h2 className="vehicle-card-title">
        <Link href={vehiclePath(vehicle.id)}>{vehicle.alias}</Link>
      </h2>
      <p className="vehicle-card-meta">{details}</p>
      {vehicle.plate ? <p className="vehicle-card-meta">Placa {vehicle.plate}</p> : null}
      {vehicle.currentKm !== null && vehicle.lastReadingDate ? (
        <p className="vehicle-card-km">
          {formatKm(vehicle.currentKm)}
          <span className="vehicle-card-meta"> · {formatDate(vehicle.lastReadingDate)}</span>
        </p>
      ) : null}
      {children}
      {actions}
    </li>
  );
}
