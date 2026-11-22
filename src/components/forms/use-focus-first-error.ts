"use client";

import { type RefObject, useEffect } from "react";

interface ErrorState {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string>;
}

/** After a failed server-side validation, move focus to the first invalid field. */
export function useFocusFirstError(formRef: RefObject<HTMLFormElement | null>, state: ErrorState) {
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [formRef, state]);
}
