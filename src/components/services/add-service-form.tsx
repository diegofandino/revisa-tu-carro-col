"use client";

import { useActionState, useRef, useState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { TextAreaField } from "@/components/forms/textarea-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import type { TypeOption } from "@/components/rules/add-rule-form";
import { READING_DATE_MIN } from "@/lib/validation/constants/reading";
import { NOTES_MAX, WORKSHOP_MAX } from "@/lib/validation/constants/service";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";

interface AddServiceFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** All types that apply to this vehicle class (services can repeat). */
  options: TypeOption[];
  today: string;
}

export function AddServiceForm({ action, options, today }: AddServiceFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const failed = state.status === "error";
  const v = (key: string, fallback = "") => (failed ? (state.values?.[key] ?? fallback) : fallback);
  const [selectedId, setSelectedId] = useState(v("maintenanceTypeId"));
  const kind = options.find((o) => o.id === selectedId)?.kind;
  const typeError = state.fieldErrors?.maintenanceTypeId;

  const mechanical = options.filter((o) => o.kind === "mechanical");
  const legal = options.filter((o) => o.kind === "legal");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="auth-form"
      aria-labelledby="add-service-title"
      onReset={() => setSelectedId("")}
    >
      <h2 id="add-service-title" className="section-title">
        Registrar servicio
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
          <optgroup label="Mecánicos">
            {mechanical.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </optgroup>
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

      <div className="field-row">
        <TextField
          id="serviceDate"
          name="serviceDate"
          label={kind === "legal" ? "Fecha de expedición o renovación" : "Fecha del servicio"}
          type="date"
          required
          min={READING_DATE_MIN}
          max={today}
          defaultValue={v("serviceDate", today)}
          error={state.fieldErrors?.serviceDate}
        />
        {kind === "legal" ? (
          <TextField
            id="expiresOn"
            name="expiresOn"
            label="Fecha de vencimiento"
            hint="La que aparece en el documento."
            type="date"
            required
            defaultValue={v("expiresOn")}
            error={state.fieldErrors?.expiresOn}
          />
        ) : (
          <TextField
            id="km"
            name="km"
            label="Kilometraje"
            hint="El del odómetro cuando se hizo el servicio."
            required
            inputMode="numeric"
            pattern="[0-9.]*"
            maxLength={9}
            autoComplete="off"
            defaultValue={v("km")}
            error={state.fieldErrors?.km ?? state.fieldErrors?.expiresOn}
          />
        )}
      </div>

      <div className="field-row">
        <TextField
          id="costCop"
          name="costCop"
          label="Costo en pesos (opcional)"
          hint="Por ejemplo 150.000"
          inputMode="numeric"
          pattern="[0-9.]*"
          maxLength={13}
          autoComplete="off"
          defaultValue={v("costCop")}
          error={state.fieldErrors?.costCop}
        />
        <TextField
          id="workshop"
          name="workshop"
          label="Taller (opcional)"
          maxLength={WORKSHOP_MAX}
          autoComplete="off"
          defaultValue={v("workshop")}
          error={state.fieldErrors?.workshop}
        />
      </div>

      <TextAreaField
        id="notes"
        name="notes"
        label="Notas (opcional)"
        maxLength={NOTES_MAX}
        rows={3}
        defaultValue={v("notes")}
        error={state.fieldErrors?.notes}
      />

      <label className="choice choice-check">
        <input type="checkbox" name="isApproximate" defaultChecked={v("isApproximate") === "on"} />
        La fecha o el kilometraje son aproximados (no recuerdo el dato exacto)
      </label>

      <SubmitButton pendingLabel="Guardando…">Registrar servicio</SubmitButton>
    </form>
  );
}
