import type { FieldErrors } from "@/lib/validation/auth";

export interface AuthFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Echoed back so the user doesn't retype it. Passwords are never echoed. */
  email?: string;
}

export const INITIAL_AUTH_FORM_STATE: AuthFormState = { status: "idle" };
