"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { TextField } from "@/components/forms/text-field";
import { formatDate } from "@/lib/format";
import { REASON_MAX, REASON_MIN } from "@/lib/validation/constants/reading";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";
import type { ServiceItem } from "@/server/repositories/services";

interface VoidServiceDialogProps {
  service: ServiceItem;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

/** Destructive confirmation in a native modal <dialog>: services are never edited, only voided. */
export function VoidServiceDialog({ service, action }: VoidServiceDialogProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const failed = state.status === "error";
  const label = `${service.maintenanceType.name} del ${formatDate(service.serviceDate)}`;

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
    if (state.status === "error") dialogRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const open = () => {
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLInputElement>('input[name="reason"]')?.focus();
  };

  return (
    <>
      <button type="button" className="btn-small" onClick={open}>
        Anular<span className="visually-hidden"> {label}</span>
      </button>

      <dialog ref={dialogRef} aria-labelledby={titleId} className="app-dialog">
        <form action={formAction} className="auth-form">
          <h2 id={titleId} className="section-title">
            Anular servicio
          </h2>
          <p className="field-hint">
            {label}. Quedará en el historial como anulado y dejará de contar para los cálculos.
            {service.maintenanceType.kind === "mechanical" ? " Su lectura de kilometraje también se quita." : ""}
          </p>
          {failed ? <FormMessage state={state} /> : null}
          <input type="hidden" name="serviceId" value={service.id} />
          <TextField
            id={`${titleId}-reason`}
            name="reason"
            label="Motivo"
            hint="Por ejemplo “Registro equivocado”."
            required
            minLength={REASON_MIN}
            maxLength={REASON_MAX}
            autoComplete="off"
            defaultValue={failed ? (state.values?.reason ?? "") : ""}
            error={state.fieldErrors?.reason}
          />
          <div className="dialog-actions">
            <button type="submit" className="btn-danger" disabled={pending}>
              {pending ? "Anulando…" : "Anular servicio"}
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
