"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { ROUTES } from "@/constants/routes";
import { EMAIL_MAX_LENGTH } from "@/lib/validation/constants/password";
import { requestPasswordReset } from "@/server/auth/actions";
import { INITIAL_AUTH_FORM_STATE } from "@/server/auth/form-state";

export function RecoverForm() {
  const [state, action] = useActionState(requestPasswordReset, INITIAL_AUTH_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} action={action} className="auth-form">
      <FormMessage state={state} />
      {state.status === "success" ? null : (
        <>
          <TextField
            id="email"
            name="email"
            label="Correo"
            type="email"
            autoComplete="username"
            spellCheck={false}
            required
            maxLength={EMAIL_MAX_LENGTH}
            enterKeyHint="send"
            defaultValue={state.email}
            error={state.fieldErrors?.email}
          />
          <SubmitButton pendingLabel="Enviando…">Enviar enlace</SubmitButton>
        </>
      )}
      <p className="auth-links">
        <Link href={ROUTES.signIn}>Volver a ingresar</Link>
      </p>
    </form>
  );
}
