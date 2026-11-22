import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="auth-main">
      <div className="auth-card">
        <h1 className="auth-title">No encontramos esta página</h1>
        <p className="auth-lead">Puede que el enlace esté mal escrito o que el contenido ya no exista.</p>
        <p className="auth-links">
          <Link href={ROUTES.dashboard}>Ir a mis vehículos</Link>
        </p>
      </div>
    </main>
  );
}
