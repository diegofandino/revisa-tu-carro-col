import type { Metadata } from "next";
import { RecoverForm } from "@/components/auth/recover-form";
import { APP_NAME } from "@/constants/app";

export const metadata: Metadata = { title: `Recuperar contraseña | ${APP_NAME}` };

export default function RecoverPage() {
  return (
    <>
      <h1 className="auth-title">Recuperar contraseña</h1>
      <p className="auth-lead">Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña.</p>
      <RecoverForm />
    </>
  );
}
