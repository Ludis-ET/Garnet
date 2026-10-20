import { Link } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";

/** Safe unavailable state (spec A4): never reveals whether protected content exists. */
export default function NotFoundScreen() {
  return (
    <Screen contentStyle={{ justifyContent: "center" }}>
      <AppText variant="title">This item isn&apos;t available here.</AppText>
      <Link href="/" style={{ marginTop: 24 }} accessibilityRole="link">
        <AppText variant="callout" color="accent">
          Go home
        </AppText>
      </Link>
    </Screen>
  );
}
