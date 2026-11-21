import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { APP_NAME } from "@/constants/app";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: `Nueva contraseña | ${APP_NAME}` };

/** Reached from the recovery email link, which starts a session in this browser. */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.recover);

  return (
    <>
      <h1 className="auth-title">Elige una nueva contraseña</h1>
      <ResetPasswordForm />
    </>
  );
}
