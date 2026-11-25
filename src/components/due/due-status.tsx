import type { RuleStatus } from "@/domain/maintenance/types";
import { statusLabel } from "@/lib/format-due";

/** Decorative glyphs: the status is always also written as text (never color or icon alone). */
const ICON_PATHS: Record<RuleStatus, string> = {
  overdue: "M12 7v6m0 4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  due_soon: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  no_baseline: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  ok: "m8 12 3 3 5-6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
};

export function DueStatus({ status }: { status: RuleStatus }) {
  return (
    <span className="due-status" data-status={status}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ICON_PATHS[status]} />
      </svg>
      {statusLabel(status)}
    </span>
  );
}
