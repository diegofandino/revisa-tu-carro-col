"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import {
  VEHICLE_ALIAS_MAX,
  VEHICLE_CLASS_LABELS,
  VEHICLE_CLASSES,
  VEHICLE_TEXT_MAX,
} from "@/lib/validation/constants/vehicle";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";

export interface VehicleFormDefaults {
  class?: string;
  alias?: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
}

interface VehicleFormProps {
  mode: "create" | "edit";
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: VehicleFormDefaults;
  cancelHref: string;
}

export function VehicleForm({ mode, action, defaults = {}, cancelHref }: VehicleFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  // After a failed submit show what the user typed; otherwise the stored values.
  const value = (key: keyof VehicleFormDefaults) =>
    state.values?.[key] ?? (defaults[key] === null || defaults[key] === undefined ? "" : String(defaults[key]));
  const classError = state.fieldErrors?.class;
  const selectedClass = value("class") || "car";

  return (
    <form ref={formRef} action={formAction} className="auth-form">
      <FormMessage state={state} />

      <fieldset className="field">
        <legend className="field-label">Tipo de vehículo</legend>
        <div className="choice-group">
          {VEHICLE_CLASSES.map((vehicleClass) => (
            <label key={vehicleClass} className="choice">
              <input
                type="radio"
                name="class"
                value={vehicleClass}
                defaultChecked={selectedClass === vehicleClass}
                required
                aria-invalid={classError ? "true" : "false"}
                aria-describedby={classError ? "class-error" : undefined}
              />
              {VEHICLE_CLASS_LABELS[vehicleClass]}
            </label>
          ))}
        </div>
        {classError ? (
          <p id="class-error" className="field-error">
            <span aria-hidden="true">⚠︎ </span>
            {classError}
          </p>
        ) : null}
      </fieldset>

      <TextField
        id="alias"
        name="alias"
        label="Nombre"
        hint="Cómo lo reconoces, por ejemplo “Carro de la casa” o “Moto”."
        required
        maxLength={VEHICLE_ALIAS_MAX}
        autoComplete="off"
        enterKeyHint="next"
        defaultValue={value("alias")}
        error={state.fieldErrors?.alias}
      />

      {mode === "create" ? (
        <TextField
          id="currentKm"
          name="currentKm"
          label="Kilometraje actual"
          hint="El número del odómetro hoy, sin puntos."
          required
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={7}
          autoComplete="off"
          enterKeyHint="next"
          defaultValue={state.values?.currentKm ?? ""}
          error={state.fieldErrors?.currentKm}
        />
      ) : null}

      <TextField
        id="brand"
        name="brand"
        label="Marca (opcional)"
        maxLength={VEHICLE_TEXT_MAX}
        autoComplete="off"
        enterKeyHint="next"
        defaultValue={value("brand")}
        error={state.fieldErrors?.brand}
      />
      <TextField
        id="model"
        name="model"
        label="Modelo (opcional)"
        maxLength={VEHICLE_TEXT_MAX}
        autoComplete="off"
        enterKeyHint="next"
        defaultValue={value("model")}
        error={state.fieldErrors?.model}
      />
      <TextField
        id="year"
        name="year"
        label="Año (opcional)"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        autoComplete="off"
        enterKeyHint="next"
        defaultValue={value("year")}
        error={state.fieldErrors?.year}
      />
      <TextField
        id="plate"
        name="plate"
        label="Placa (opcional)"
        hint="Por ejemplo ABC123 o ABC12D."
        maxLength={9}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        enterKeyHint="done"
        defaultValue={value("plate")}
        error={state.fieldErrors?.plate}
      />

      <SubmitButton pendingLabel="Guardando…">
        {mode === "create" ? "Agregar vehículo" : "Guardar cambios"}
      </SubmitButton>
      <p className="auth-links">
        <Link href={cancelHref}>Cancelar</Link>
      </p>
    </form>
  );
}
