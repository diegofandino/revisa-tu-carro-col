"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { type FormState, INITIAL_FORM_STATE } from "@/server/forms/form-state";

interface ArchiveButtonProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  /** Extra context for screen readers only (e.g. which rule), so the visible text stays short. */
  hiddenLabel?: string;
}

/** Archive / unarchive as a real form, so it works without JavaScript and shows server errors. */
export function ArchiveButton({ action, label, pendingLabel, hiddenLabel }: ArchiveButtonProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  return (
    <form action={formAction} className="inline-form">
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? pendingLabel : label}
        {hiddenLabel && !pending ? <span className="visually-hidden"> {hiddenLabel}</span> : null}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
