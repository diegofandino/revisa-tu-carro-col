import { formatCop, formatDate, formatKm } from "@/lib/format";
import { SERVICES_PAGE_SIZE } from "@/lib/validation/constants/service";
import type { FormState } from "@/server/forms/form-state";
import type { ServiceItem } from "@/server/repositories/services";
import { VoidServiceDialog } from "./void-service-dialog";

interface ServicesHistoryProps {
  services: ServiceItem[];
  voidAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  editable: boolean;
}

export function ServicesHistory({ services, voidAction, editable }: ServicesHistoryProps) {
  return (
    <section aria-labelledby="services-title" className="stack-section">
      <h2 id="services-title" className="section-title">
        Historial de servicios
      </h2>
      {services.length === 0 ? (
        <p className="panel-lead">Todavía no has registrado servicios.</p>
      ) : (
        <ol className="readings-list">
          {services.map((s) => {
            const voided = s.voidedAt !== null;
            const details = [
              formatDate(s.serviceDate),
              s.km !== null ? formatKm(s.km) : null,
              s.expiresOn ? `vence ${formatDate(s.expiresOn)}` : null,
              s.costCop !== null ? formatCop(s.costCop) : null,
              s.workshop,
            ].filter(Boolean);
            return (
              <li key={s.id} className={voided ? "reading-item reading-item-voided" : "reading-item"}>
                <div>
                  <p className="reading-km">
                    {s.maintenanceType.name}
                    {voided ? " (anulado)" : ""}
                  </p>
                  <p className="vehicle-card-meta">{details.join(" · ")}</p>
                  {s.isApproximate ? <p className="vehicle-card-meta">Datos aproximados</p> : null}
                  {s.notes ? <p className="vehicle-card-meta">Notas: {s.notes}</p> : null}
                  {voided ? <p className="vehicle-card-meta">Anulado: {s.voidReason}</p> : null}
                </div>
                {editable && !voided ? <VoidServiceDialog service={s} action={voidAction} /> : null}
              </li>
            );
          })}
        </ol>
      )}
      {services.length === SERVICES_PAGE_SIZE ? (
        <p className="vehicle-card-meta">Se muestran los {SERVICES_PAGE_SIZE} servicios más recientes.</p>
      ) : null}
    </section>
  );
}
