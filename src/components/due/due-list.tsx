import Link from "next/link";
import { dueEstimate, dueHeadline, dueLimit } from "@/lib/format-due";
import type { VehicleDueView } from "@/server/vehicles/due";
import { registerServicePath } from "@/server/vehicles/paths";
import { DueStatus } from "./due-status";

type DueItems = VehicleDueView["items"];

interface DueListProps {
  vehicleId: string;
  items: DueItems;
  /** Offer "Registrar servicio" on items without a baseline (not for archived vehicles). */
  canRegister: boolean;
}

/** Full list on the vehicle page, already ordered by urgency. */
export function DueList({ vehicleId, items, canRegister }: DueListProps) {
  return (
    <ul className="due-list">
      {items.map(({ ruleId, maintenanceTypeId, name, kind, evaluation: e }) => {
        const limit = dueLimit(kind, e);
        const estimate = dueEstimate(e);
        return (
          <li key={ruleId} className="due-item" data-status={e.status}>
            <div className="due-item-head">
              <h3 className="due-item-name">{name}</h3>
              <DueStatus status={e.status} />
            </div>
            <p className="due-item-headline">{dueHeadline(kind, e)}</p>
            {limit ? <p className="vehicle-card-meta">{limit}</p> : null}
            {estimate ? <p className="vehicle-card-meta">{estimate}</p> : null}
            {e.isApproximate ? <p className="vehicle-card-meta">Datos aproximados</p> : null}
            {e.status === "no_baseline" && canRegister ? (
              <Link href={registerServicePath(vehicleId, maintenanceTypeId)} className="btn-secondary btn-link">
                Registrar servicio<span className="visually-hidden"> de {name}</span>
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact list for a vehicle card on the dashboard: name, status and the main line. */
export function DueListCompact({ items }: { items: DueItems }) {
  return (
    <ul className="due-list-compact">
      {items.map(({ ruleId, name, kind, evaluation: e }) => (
        <li key={ruleId} className="due-compact-item" data-status={e.status}>
          <DueStatus status={e.status} />
          <span>
            <strong>{name}</strong>: {dueHeadline(kind, e)}
          </span>
        </li>
      ))}
    </ul>
  );
}
