import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { APP_NAME } from "@/constants/app";

export const metadata: Metadata = { title: `Crear cuenta | ${APP_NAME}` };

export default function SignUpPage() {
  return (
    <>
      <h1 className="auth-title">Crear cuenta</h1>
      <SignUpForm />
    </>
  );
}
