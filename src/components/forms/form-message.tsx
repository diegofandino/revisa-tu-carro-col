interface MessageState {
  status: "idle" | "error" | "success";
  message?: string;
}

/** Persistent polite live region: its text changes are announced; it is never re-mounted. */
export function FormMessage({ state }: { state: MessageState }) {
  const tone = state.status === "error" ? "form-message form-message-error" : "form-message form-message-success";
  return (
    <div aria-live="polite" aria-atomic="true">
      {state.message ? (
        <p className={tone}>
          <span aria-hidden="true">{state.status === "error" ? "⚠︎ " : "✓ "}</span>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
