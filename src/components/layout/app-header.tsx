import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";

/**
 * Brand bar, navy in both color schemes: it sits behind the translucent iOS status bar,
 * whose text is white, so it must stay dark.
 */
export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="app-header">
      <Link href={ROUTES.home} className="app-header-brand">
        {APP_NAME}
      </Link>
      {children}
    </header>
  );
}
