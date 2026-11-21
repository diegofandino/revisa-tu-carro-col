import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { ROUTES } from "@/constants/routes";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/** Only the link types our email templates send. */
const ALLOWED_TYPES = new Set<EmailOtpType>(["email", "signup", "recovery", "email_change"]);

/** Verifies the token from the confirmation / recovery email (token_hash flow) and starts a session. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? ROUTES.resetPassword : ROUTES.dashboard;
  const next = safeNextPath(params.get("next"), fallback);

  if (tokenHash && tokenHash.length <= 512 && type && ALLOWED_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }

  // Fixed, non-reflective error code: never put provider messages in the URL.
  redirect(`${ROUTES.signIn}?error=enlace`);
}
