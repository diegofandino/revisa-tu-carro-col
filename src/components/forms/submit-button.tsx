"use client";

import { useFormStatus } from "react-dom";

/** Disabled only while a valid submission is in flight, to prevent double posts. */
export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
