import type { InputHTMLAttributes, ReactNode } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> {
  id: string;
  name: string;
  label: string;
  /** Persistent help text, rendered above the input so the keyboard/autofill never covers it. */
  hint?: string;
  /** Server-side error for this field. */
  error?: string;
  /** Extra control rendered next to the input (e.g. show-password toggle). */
  addon?: ReactNode;
}

export function TextField({ id, name, label, hint, error, addon, ...inputProps }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      <div className="field-control">
        <input
          id={id}
          name={name}
          className="field-input"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {addon}
      </div>
      {error ? (
        <p id={errorId} className="field-error">
          <span aria-hidden="true">⚠︎ </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
