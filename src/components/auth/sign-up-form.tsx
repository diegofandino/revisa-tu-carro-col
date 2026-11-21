"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { ROUTES } from "@/constants/routes";
import { EMAIL_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation/constants/password";
import { signUp } from "@/server/auth/actions";
import { INITIAL_AUTH_FORM_STATE } from "@/server/auth/form-state";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, INITIAL_AUTH_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  if (state.status === "success") {
    return (
      <div className="auth-form">
        <FormMessage state={state} />
        <p className="auth-links">
          <Link href={ROUTES.signIn}>Ir a ingresar</Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="auth-form">
      <FormMessage state={state} />
      <TextField
        id="email"
        name="email"
        label="Correo"
        type="email"
        autoComplete="username"
        spellCheck={false}
        required
        maxLength={EMAIL_MAX_LENGTH}
        enterKeyHint="next"
        defaultValue={state.email}
        error={state.fieldErrors?.email}
      />
      <PasswordField
        id="new-password"
        name="password"
        label="Contraseña"
        hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres. Puedes usar la contraseña segura que sugiere tu teléfono.`}
        autoComplete="new-password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        enterKeyHint="done"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="auth-links">
        <Link href={ROUTES.signIn}>Ya tengo una cuenta</Link>
      </p>
    </form>
  );
}
