/** AUTH-10 · Terms of use (P-79) */
import { TERMS } from "@/content/legal";
import { LegalScreen } from "@/features/auth/screens/LegalScreen";

export default function TermsRoute() {
  return <LegalScreen document={TERMS} />;
}
