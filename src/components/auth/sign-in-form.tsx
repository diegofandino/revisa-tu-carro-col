"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { useFocusFirstError } from "@/components/forms/use-focus-first-error";
import { ROUTES } from "@/constants/routes";
import { EMAIL_MAX_LENGTH } from "@/lib/validation/constants/password";
import { signIn } from "@/server/auth/actions";
import { type AuthFormState, INITIAL_AUTH_FORM_STATE } from "@/server/auth/form-state";

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const initialState: AuthFormState = notice ? { status: "error", message: notice } : INITIAL_AUTH_FORM_STATE;
  const [state, action] = useActionState(signIn, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  return (
    <form ref={formRef} action={action} className="auth-form">
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
        id="current-password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        enterKeyHint="go"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingLabel="Ingresando…">Ingresar</SubmitButton>
      <p className="auth-links">
        <Link href={ROUTES.recover}>¿Olvidaste tu contraseña?</Link>
        <Link href={ROUTES.signUp}>Crear una cuenta</Link>
      </p>
    </form>
  );
}
