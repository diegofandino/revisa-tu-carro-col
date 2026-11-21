import type { Metadata } from "next";
import { APP_NAME } from "@/constants/app";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: `Panel | ${APP_NAME}` };

export default async function PanelPage() {
  const user = await getCurrentUser();

  return (
    <>
      <h1 className="panel-title">Tu panel</h1>
      <p className="panel-lead">
        Sesión iniciada como <strong>{user?.email}</strong>.
      </p>
      <p className="panel-lead">Pronto verás aquí tus vehículos y sus próximos mantenimientos.</p>
    </>
  );
}
