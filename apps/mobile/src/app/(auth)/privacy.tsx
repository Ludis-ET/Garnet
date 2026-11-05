/** AUTH-10 · Privacy notice (P-79) */
import { PRIVACY } from "@/content/legal";
import { LegalScreen } from "@/features/auth/screens/LegalScreen";

export default function PrivacyRoute() {
  return <LegalScreen document={PRIVACY} />;
}
