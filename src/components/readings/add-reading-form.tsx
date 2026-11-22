"use client";

import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { READING_DATE_MIN } from "@/lib/validation/constants/reading";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";

interface AddReadingFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Today in Colombia, computed on the server (the device clock may be wrong). */
  today: string;
}

export function AddReadingForm({ action, today }: AddReadingFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);
  const failed = state.status === "error";

  return (
    <form ref={formRef} action={formAction} className="auth-form" aria-labelledby="add-reading-title">
      <h2 id="add-reading-title" className="section-title">
        Agregar lectura
      </h2>
      <FormMessage state={state} />
      <div className="field-row">
        <TextField
          id="readingDate"
          name="readingDate"
          label="Fecha"
          type="date"
          required
          min={READING_DATE_MIN}
          max={today}
          defaultValue={failed ? (state.values?.readingDate ?? today) : today}
          error={state.fieldErrors?.readingDate}
        />
        <TextField
          id="km"
          name="km"
          label="Kilometraje"
          required
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={7}
          autoComplete="off"
          enterKeyHint="done"
          defaultValue={failed ? (state.values?.km ?? "") : ""}
          error={state.fieldErrors?.km}
        />
      </div>
      <SubmitButton pendingLabel="Guardando…">Guardar lectura</SubmitButton>
    </form>
  );
}
