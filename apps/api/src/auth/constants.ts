/** Where Better Auth's routes live (its basePath). */
export const AUTH_BASE = "/v1/auth";

/**
 * The client's address as the API itself saw it, the only one Better Auth may use (rate limits,
 * session records). Fastify doesn't trust proxies, so request.ip is the socket's address.
 */
export const CLIENT_IP_HEADER = "x-garnet-client-ip";

/** Where each provider's sign-in page lives: the only places the authorisation proxy may go. */
export const PROVIDER_HOSTS = {
  google: "accounts.google.com",
  apple: "appleid.apple.com",
} as const;
export type ProviderId = keyof typeof PROVIDER_HOSTS;

/** How recent a sign-in must be to change how someone gets in (P-80). */
export const RECENT_SIGN_IN_SECONDS = 24 * 60 * 60;

/** True when a session began recently enough for a sensitive change (P-80). */
export function isRecentSignIn(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < RECENT_SIGN_IN_SECONDS * 1000;
}
