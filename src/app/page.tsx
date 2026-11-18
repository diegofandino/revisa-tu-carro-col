import { connection } from "next/server";
import { APP_NAME } from "@/constants/app";

export default async function Home() {
  // Dynamic rendering is required for the per-request CSP nonce.
  await connection();

  return (
    <main className="safe-area-pad flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand text-center text-on-brand">
      <h1 className="text-3xl font-bold">{APP_NAME}</h1>
      <p className="max-w-[60ch] text-on-brand-muted">
        Pronto podrás registrar tus vehículos y saber cuándo toca el próximo mantenimiento.
      </p>
    </main>
  );
}
