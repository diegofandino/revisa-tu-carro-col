import type { Metadata } from "next";
import Link from "next/link";
import { AddRuleForm } from "@/components/rules/add-rule-form";
import { EditRuleDialog } from "@/components/rules/edit-rule-dialog";
import { ArchiveButton } from "@/components/vehicles/archive-button";
import { APP_NAME } from "@/constants/app";
import { formatInterval } from "@/lib/format";
import { listCurrentRules, listMaintenanceTypes } from "@/server/repositories/rules";
import { archiveRuleAction, createRuleAction, updateRuleAction } from "@/server/rules/actions";
import { loadDashboardContext, loadVehicleOr404 } from "@/server/vehicles/load";
import { vehiclePath } from "@/server/vehicles/paths";

export const metadata: Metadata = { title: `Mantenimientos | ${APP_NAME}` };

export default async function RulesPage({ params }: PageProps<"/panel/vehiculos/[id]/reglas">) {
  const { id } = await params;
  const vehicle = await loadVehicleOr404(id);
  const archived = vehicle.archivedAt !== null;
  const { supabase } = await loadDashboardContext();
  const [rules, types] = await Promise.all([listCurrentRules(supabase, vehicle.id), listMaintenanceTypes(supabase)]);

  const ruled = new Set(rules.map((r) => r.maintenanceType.id));
  const options = types
    .filter((t) => t.appliesTo.includes(vehicle.class) && !ruled.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, kind: t.kind }));

  return (
    <>
      <p className="auth-links">
        <Link href={vehiclePath(vehicle.id)}>← {vehicle.alias}</Link>
      </p>
      <h1 className="panel-title">Mantenimientos de {vehicle.alias}</h1>
      <p className="panel-lead">
        Configura cada cuánto toca cada mantenimiento. Solo hay una regla vigente por mantenimiento; los servicios que
        registres sí se acumulan en el historial.
      </p>

      <section aria-labelledby="rules-title" className="stack-section">
        <h2 id="rules-title" className="section-title">
          Reglas vigentes
        </h2>
        {rules.length === 0 ? (
          <p className="panel-lead">Todavía no tienes mantenimientos configurados.</p>
        ) : (
          <ul className="readings-list">
            {rules.map((rule) => (
              <li key={rule.id} className="reading-item">
                <div>
                  <p className="reading-km">{rule.maintenanceType.name}</p>
                  <p className="vehicle-card-meta">
                    {formatInterval(rule.maintenanceType.kind, rule.intervalKm, rule.intervalMonths)}
                  </p>
                </div>
                {archived ? null : (
                  <div className="panel-actions">
                    {rule.maintenanceType.kind === "mechanical" ? (
                      <EditRuleDialog rule={rule} action={updateRuleAction.bind(null, vehicle.id)} />
                    ) : null}
                    <ArchiveButton
                      action={archiveRuleAction.bind(null, vehicle.id, rule.id)}
                      label={`Archivar ${rule.maintenanceType.name}`}
                      pendingLabel="Archivando…"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived ? (
        <p className="notice">Desarchiva el vehículo para configurar sus mantenimientos.</p>
      ) : (
        <AddRuleForm action={createRuleAction.bind(null, vehicle.id)} options={options} />
      )}
    </>
  );
}
