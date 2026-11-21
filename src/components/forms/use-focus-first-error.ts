"use client";

import { type RefObject, useEffect } from "react";
import type { AuthFormState } from "@/server/auth/form-state";

/** After a failed server-side validation, move focus to the first invalid field. */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: AuthFormState) {
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [formRef, state]);
}
