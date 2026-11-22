import type { TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name"> {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

/** Multi-line counterpart of TextField (same label/hint/error wiring). */
export function TextAreaField({ id, name, label, hint, error, ...props }: TextAreaFieldProps) {
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
      <textarea
        id={id}
        name={name}
        className="field-input field-textarea"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={describedBy}
        {...props}
      />
      {error ? (
        <p id={errorId} className="field-error">
          <span aria-hidden="true">⚠︎ </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
