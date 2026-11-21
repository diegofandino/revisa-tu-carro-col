import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { APP_NAME } from "@/constants/app";
import { safeNextPath } from "@/lib/security/safe-redirect";

export const metadata: Metadata = { title: `Ingresar | ${APP_NAME}` };

const NOTICES: Record<string, string> = {
  enlace: "El enlace no es válido o ya expiró. Solicita uno nuevo.",
};

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const notice = errorKey && Object.hasOwn(NOTICES, errorKey) ? NOTICES[errorKey] : undefined;

  return (
    <>
      <h1 className="auth-title">Ingresar</h1>
      <SignInForm next={next} notice={notice} />
    </>
  );
}
