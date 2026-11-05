import { Redirect } from "expo-router";

/**
 * garnet://auth-callback: where a Google or Apple sign-in in the browser comes back (P-79). The
 * sign-in itself finishes in the code that opened the browser, which trades the one-time code
 * for the session (it alone holds the secret); this route only returns to the entry gate, so
 * the link never leaves a blank screen. It reads nothing from the link.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
