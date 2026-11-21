"use client";

import { useState } from "react";
import { TextField, type TextFieldProps } from "./text-field";

type PasswordFieldProps = Omit<TextFieldProps, "type" | "addon"> & {
  autoComplete: "current-password" | "new-password";
};

/** Password input with an accessible show/hide toggle. Pasting is always allowed. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      addon={
        <button
          type="button"
          className="field-toggle"
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      }
    />
  );
}
