import { Redirect, usePathname } from "expo-router";
import { StyleSheet } from "react-native";
import { TabList, Tabs, TabSlot } from "expo-router/ui";
import { useAuthStatus } from "@/features/auth/useAuth";
import { usePairingStatus } from "@/features/pairing/usePairing";
import { useSetupState } from "@/features/setup/useSetup";
import { Watchers } from "@/features/companions/Watchers";
import { GlassTabBar, HIDES_TAB_BAR, tabTriggers } from "@/features/tabs/GlassTabBar";

/**
 * The five tabs (spec: Home, Days, Us, Moments, Our World) behind a floating liquid-glass tab
 * bar (P-53). Only signed-in, paired, set-up people get in; everyone else goes back through
 * the entry gate.
 */
export default function TabsLayout() {
  const auth = useAuthStatus();
  const signedIn = auth.data?.kind === "signedIn";
  const pairing = usePairingStatus(signedIn);
  const setup = useSetupState(signedIn);
  const pathname = usePathname();
  if (auth.data !== undefined && !signedIn) return <Redirect href="/" />;
  if (pairing.data !== undefined && pairing.data.kind !== "paired") return <Redirect href="/" />;
  if (setup.data !== undefined && !setup.data.profile.complete) return <Redirect href="/setup" />;
  // Nothing of the space opens until the partner has finished setup too (P-99).
  if (setup.data !== undefined && !setup.data.partner.ready) return <Redirect href="/waiting" />;
  return (
    <Tabs style={styles.fill}>
      <TabSlot style={styles.fill} />
      {/* Ruby and Sapphire peek over the bar on every tab page (P-57). */}
      <Watchers hidden={HIDES_TAB_BAR.includes(pathname)} />
      <TabList asChild>
        <GlassTabBar>{tabTriggers()}</GlassTabBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Scrolling rule: the tab containers must be exactly one screen tall. expo-router's slot
  // grows with its content by default, which makes each tab as tall as its page, so nothing
  // ever scrolls (owner report 2026-10-23; guarded by app/__tests__/tabsLayout.test.tsx).
  fill: { flex: 1, minHeight: 0 },
});
