import { AppHeader } from "@/components/layout/app-header";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader />
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </>
  );
}
