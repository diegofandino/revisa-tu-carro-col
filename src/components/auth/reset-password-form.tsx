"use client";

import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/constants/password";
import { updatePassword } from "@/server/auth/actions";
import { INITIAL_AUTH_FORM_STATE } from "@/server/auth/form-state";

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, INITIAL_AUTH_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} action={action} className="auth-form">
      <FormMessage state={state} />
      <PasswordField
        id="new-password"
        name="password"
        label="Nueva contraseña"
        hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        enterKeyHint="done"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
