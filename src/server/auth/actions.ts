"use server";

import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, recoverSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";
import { authErrorMessage, isRateLimit } from "./errors";
import type { AuthFormState } from "./form-state";

const INVALID_FIELDS = "Revisa los campos marcados.";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email") ?? "";
  const parsed = signInSchema.safeParse({ email, password: text(formData, "password") });
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error.code), email: parsed.data.email };

  redirect(safeNextPath(text(formData, "next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email") ?? "";
  const parsed = signUpSchema.safeParse({
    email,
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password });
  // With email confirmation on, Supabase answers the same for new and existing emails; so do we.
  if (error && (isRateLimit(error.code) || error.code === "weak_password" || error.code === "signup_disabled")) {
    return { status: "error", message: authErrorMessage(error.code), email: parsed.data.email };
  }
  return {
    status: "success",
    message: "Te enviamos un correo para confirmar tu cuenta. Abre el enlace y luego ingresa con tu contraseña.",
  };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = text(formData, "email") ?? "";
  const parsed = recoverSchema.safeParse({ email });
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error), email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error && isRateLimit(error.code)) {
    return { status: "error", message: authErrorMessage(error.code), email: parsed.data.email };
  }
  // Same answer whether or not the account exists.
  return {
    status: "success",
    message: "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.",
  };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({ password: text(formData, "password") });
  if (!parsed.success) {
    return { status: "error", message: INVALID_FIELDS, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", message: authErrorMessage("session_not_found") };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error.code) };

  redirect(ROUTES.dashboard);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(ROUTES.signIn);
}
