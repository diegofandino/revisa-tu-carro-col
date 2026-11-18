/**
 * Builds the Content-Security-Policy header value.
 * Based on the nonce strategy in the Next.js CSP guide (node_modules/next/dist/docs).
 */
export function buildCsp({
  nonce,
  isDev,
  isHttps,
  supabaseUrl,
}: {
  nonce: string;
  isDev: boolean;
  /** Whether the page is served over HTTPS; upgrading subresources on plain HTTP would break them. */
  isHttps: boolean;
  supabaseUrl: string;
}): string {
  const supabase = new URL(supabaseUrl);
  const wsProtocol = supabase.protocol === "https:" ? "wss:" : "ws:";
  const connectSrc = ["'self'", supabase.origin, `${wsProtocol}//${supabase.host}`];

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev && isHttps) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}
