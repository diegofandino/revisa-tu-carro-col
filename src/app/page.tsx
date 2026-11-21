import Link from "next/link";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";

export default function Home() {
  return (
    <main className="safe-area-pad flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand text-center text-on-brand">
      <h1 className="text-3xl font-bold">{APP_NAME}</h1>
      <p className="max-w-[60ch] text-on-brand-muted">
        Registra tus vehículos y sabe cuándo toca el próximo mantenimiento, por kilometraje o por tiempo.
      </p>
      <nav aria-label="Cuenta" className="home-actions">
        <Link href={ROUTES.signIn} className="btn-on-brand">
          Ingresar
        </Link>
        <Link href={ROUTES.signUp} className="btn-on-brand-outline">
          Crear cuenta
        </Link>
      </nav>
    </main>
  );
}
