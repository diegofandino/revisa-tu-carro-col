import type { FieldErrors } from "@/lib/validation/auth";

/** Result of a Server Action used with useActionState. */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Submitted text values echoed back so the user doesn't retype them (never secrets). */
  values?: Record<string, string>;
}

export const INITIAL_FORM_STATE: FormState = { status: "idle" };

/** Plain string values from FormData, for echoing back on error. */
export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
