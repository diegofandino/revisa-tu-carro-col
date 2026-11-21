import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ROUTES } from "@/constants/routes";
import { signOut } from "@/server/auth/actions";
import { getCurrentUser } from "@/server/auth/session";

/** Server-side gate for the whole dashboard (the proxy redirect is only a convenience). */
export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const user = await getCurrentUser();
  if (!user) redirect(`${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.dashboard)}`);

  return (
    <>
      <AppHeader>
        <form action={signOut}>
          <button type="submit" className="btn-header">
            Salir
          </button>
        </form>
      </AppHeader>
      <main className="panel-main">{children}</main>
    </>
  );
}
