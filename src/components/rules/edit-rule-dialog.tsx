"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { TextField } from "@/components/forms/text-field";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";
import type { RuleItem } from "@/server/repositories/rules";

interface EditRuleDialogProps {
  rule: RuleItem;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

/** Native modal <dialog> to change a mechanical rule's intervals (same pattern as readings). */
export function EditRuleDialog({ rule, action }: EditRuleDialogProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const failed = state.status === "error";

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
    if (state.status === "error") dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const open = () => {
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLInputElement>('input[name="intervalKm"]')?.focus();
  };
  const value = (key: "intervalKm" | "intervalMonths", stored: number | null) =>
    failed ? (state.values?.[key] ?? "") : stored === null ? "" : String(stored);

  return (
    <>
      <button type="button" className="btn-small" onClick={open}>
        Editar<span className="visually-hidden"> {rule.maintenanceType.name}</span>
      </button>
      {state.status === "success" ? <FormMessage state={state} /> : null}

      <dialog ref={dialogRef} aria-labelledby={titleId} className="app-dialog">
        <form action={formAction} className="auth-form">
          <h2 id={titleId} className="section-title">
            {rule.maintenanceType.name}
          </h2>
          <p className="field-hint">Puedes llenar uno o ambos: avisaremos con lo que ocurra primero.</p>
          {failed ? <FormMessage state={state} /> : null}
          <input type="hidden" name="ruleId" value={rule.id} />
          <TextField
            id={`${titleId}-km`}
            name="intervalKm"
            label="Cada cuántos km"
            inputMode="numeric"
            pattern="[0-9.]*"
            maxLength={7}
            autoComplete="off"
            defaultValue={value("intervalKm", rule.intervalKm)}
            error={state.fieldErrors?.intervalKm}
          />
          <TextField
            id={`${titleId}-months`}
            name="intervalMonths"
            label="Cada cuántos meses"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            autoComplete="off"
            defaultValue={value("intervalMonths", rule.intervalMonths)}
            error={state.fieldErrors?.intervalMonths}
          />
          <div className="dialog-actions">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
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
