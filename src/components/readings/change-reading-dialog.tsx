"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { TextField } from "@/components/forms/text-field";
import { formatDate, formatKm } from "@/lib/format";
import { READING_DATE_MIN, REASON_MAX, REASON_MIN } from "@/lib/validation/constants/reading";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";
import type { ReadingItem } from "@/server/repositories/readings";

interface ChangeReadingDialogProps {
  reading: ReadingItem;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  today: string;
}

/**
 * Native modal <dialog> (focus containment, inert page, Esc and focus return come from the browser).
 * Opened with showModal() from the button: works on every iOS version that runs the app.
 */
export function ChangeReadingDialog({ reading, action, today }: ChangeReadingDialogProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const failed = state.status === "error";

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
    if (state.status === "error") {
      dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  // showModal() focuses the first control; the primary field for a correction is the km.
  const open = () => {
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLInputElement>('input[name="km"]')?.focus();
  };

  return (
    <>
      <button type="button" className="btn-small" onClick={open}>
        Corregir<span className="visually-hidden"> lectura del {formatDate(reading.readingDate)}</span>
      </button>
      {state.status === "success" ? <FormMessage state={state} /> : null}

      <dialog ref={dialogRef} aria-labelledby={titleId} className="app-dialog">
        <form action={formAction} className="auth-form">
          <h2 id={titleId} className="section-title">
            Corregir lectura
          </h2>
          <p className="field-hint">
            Actual: {formatKm(reading.km)} el {formatDate(reading.readingDate)}. El cambio queda en el historial con su
            motivo.
          </p>
          {failed ? <FormMessage state={state} /> : null}
          <input type="hidden" name="readingId" value={reading.id} />
          <TextField
            id={`${titleId}-date`}
            name="readingDate"
            label="Fecha"
            type="date"
            required
            min={READING_DATE_MIN}
            max={today}
            defaultValue={failed ? (state.values?.readingDate ?? reading.readingDate) : reading.readingDate}
            error={state.fieldErrors?.readingDate}
          />
          <TextField
            id={`${titleId}-km`}
            name="km"
            label="Kilometraje"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={7}
            autoComplete="off"
            defaultValue={failed ? (state.values?.km ?? String(reading.km)) : String(reading.km)}
            error={state.fieldErrors?.km}
          />
          <TextField
            id={`${titleId}-reason`}
            name="reason"
            label="Motivo"
            hint="Por ejemplo “Error de digitación” o “Lectura duplicada”."
            required
            minLength={REASON_MIN}
            maxLength={REASON_MAX}
            autoComplete="off"
            defaultValue={failed ? (state.values?.reason ?? "") : ""}
            error={state.fieldErrors?.reason}
          />
          <div className="dialog-actions">
            <button type="submit" name="intent" value="correct" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar corrección"}
            </button>
            <button type="submit" name="intent" value="delete" className="btn-danger" disabled={pending}>
              Eliminar lectura
            </button>
            <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()}>
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
