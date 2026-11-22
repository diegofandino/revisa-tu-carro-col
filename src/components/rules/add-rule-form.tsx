"use client";

import { useActionState, useRef, useState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import type { MaintenanceKind } from "@/lib/validation/constants/rule";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";

export interface TypeOption {
  id: string;
  name: string;
  kind: MaintenanceKind;
}

interface AddRuleFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Types that apply to this vehicle class and have no current rule yet. */
  options: TypeOption[];
}

export function AddRuleForm({ action, options }: AddRuleFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const failed = state.status === "error";
  const [selectedId, setSelectedId] = useState(failed ? (state.values?.maintenanceTypeId ?? "") : "");
  const selectedKind = options.find((o) => o.id === selectedId)?.kind;
  const typeError = state.fieldErrors?.maintenanceTypeId;

  if (options.length === 0) {
    return <p className="panel-lead">Ya configuraste todos los mantenimientos disponibles para este vehículo.</p>;
  }

  const mechanical = options.filter((o) => o.kind === "mechanical");
  const legal = options.filter((o) => o.kind === "legal");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="auth-form"
      aria-labelledby="add-rule-title"
      onReset={() => setSelectedId("")}
    >
      <h2 id="add-rule-title" className="section-title">
        Agregar mantenimiento
      </h2>
      <FormMessage state={state} />

      <div className="field">
        <label htmlFor="maintenanceTypeId" className="field-label">
          Mantenimiento
        </label>
        <select
          id="maintenanceTypeId"
          name="maintenanceTypeId"
          className="field-input"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-invalid={typeError ? "true" : "false"}
          aria-describedby={typeError ? "maintenanceTypeId-error" : undefined}
        >
          <option value="">Elige uno…</option>
          {mechanical.length > 0 ? (
            <optgroup label="Mecánicos">
              {mechanical.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {legal.length > 0 ? (
            <optgroup label="Documentos">
              {legal.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        {typeError ? (
          <p id="maintenanceTypeId-error" className="field-error">
            <span aria-hidden="true">⚠︎ </span>
            {typeError}
          </p>
        ) : null}
      </div>

      {selectedKind === "legal" ? (
        <p className="notice">
          SOAT y técnico-mecánica no usan intervalo: te recordaremos según la fecha de vencimiento que registres en el
          servicio.
        </p>
      ) : (
        <>
          <p className="field-hint">
            Usa los intervalos del manual de tu vehículo. Puedes llenar uno o ambos: avisaremos con lo que ocurra
            primero.
          </p>
          <div className="field-row">
            <TextField
              id="intervalKm"
              name="intervalKm"
              label="Cada cuántos km"
              inputMode="numeric"
              pattern="[0-9.]*"
              maxLength={7}
              autoComplete="off"
              defaultValue={failed ? (state.values?.intervalKm ?? "") : ""}
              error={state.fieldErrors?.intervalKm}
            />
            <TextField
              id="intervalMonths"
              name="intervalMonths"
              label="Cada cuántos meses"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              autoComplete="off"
              defaultValue={failed ? (state.values?.intervalMonths ?? "") : ""}
              error={state.fieldErrors?.intervalMonths}
            />
          </div>
        </>
      )}

      <SubmitButton pendingLabel="Guardando…">Agregar mantenimiento</SubmitButton>
    </form>
  );
}
