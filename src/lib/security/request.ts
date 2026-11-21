/**
 * Whether the original request used HTTPS. Behind a TLS-terminating proxy (e.g. Vercel) the scheme
 * arrives in x-forwarded-proto; otherwise fall back to the URL's protocol.
 */
export function isHttpsRequest(forwardedProto: string | null, protocol: string | null): boolean {
  const scheme = forwardedProto?.split(",")[0]?.trim() || protocol?.replace(":", "") || "";
  return scheme.toLowerCase() === "https";
}
