/**
 * SYS-06 · Prototype affordances. A slim tab inside the right-hand screen gutter, just below the
 * header row (clear of fields, switches and footer actions), opens the developer panel: simulate
 * offline, failures and slow responses, reset demo data, and jump to account states that are
 * hard to reach by hand (expired links, unsent items, expired session). Clearly secondary and
 * labelled, never mistaken for a real feature (apps/mobile/AGENTS.md rule 4).
 */
import { useRouter } from "expo-router";
import { useState, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { DEMO_RESET_TOKENS } from "@/data/fixtures/demoAuth";
import { useDemoControls } from "@/data/RepositoryProvider";
import { useTheme, useThemeSettings, type SchemePreference } from "@/theme/ThemeProvider";
import { useHomeDemo, usePairingDemo, useSetupDemo } from "./demoActions";
import { touchTarget } from "@/theme/tokens";

const APPEARANCES: readonly { label: string; value: SchemePreference }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Follow system", value: "system" },
];

const LATENCIES = [
  { label: "Instant", ms: 0 },
  { label: "Normal", ms: 350 },
  { label: "Slow", ms: 1500 },
] as const;

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

export function PrototypePanel() {
  const router = useRouter();
  const store = useDemoControls();
  const { colors, radii, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const { schemePreference, setSchemePreference } = useThemeSettings();
  const pairingDemo = usePairingDemo();
  const setupDemo = useSetupDemo();
  const homeDemo = useHomeDemo();
  const [open, setOpen] = useState(false);
  const state = useSyncExternalStore(
    (l) => store.subscribe(l),
    () => store.read(),
  );
  const settings = useSyncExternalStore(
    (l) => store.subscribe(l),
    () => store.settings,
  );
  const auth = state.auth;
  const partnerSide = state.profiles.partner.side;

  const setAuth = (patch: Partial<typeof auth>) => {
    store.update((s) => ({ ...s, auth: { ...s.auth, ...patch } }));
  };
  const go = (href: Parameters<typeof router.push>[0]) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Prototype controls"
        accessibilityHint="Simulate offline, failures and account states. Not a real feature."
        // 16 wide (fits the 16-pt gutter) + 32 slop = the 48-pt touch target.
        hitSlop={{ left: 32 }}
        style={[
          styles.handle,
          {
            top: insets.top + 72,
            right: insets.right,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.pill,
            borderBottomLeftRadius: radii.pill,
          },
        ]}
      >
        <Icon name="sparkle" size={10} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <View style={[styles.sheetWrap, { backgroundColor: colors.scrim }]}>
          <Pressable
            style={styles.flex}
            onPress={() => {
              setOpen(false);
            }}
            accessibilityLabel="Close prototype controls"
            accessibilityRole="button"
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              elevation.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
              <View style={styles.row}>
                <AppText variant="title" style={styles.flex}>
                  Prototype controls
                </AppText>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={styles.close}
                >
                  <Icon name="x" color={colors.textSecondary} />
                </Pressable>
              </View>
              <AppText variant="footnote" color="textTertiary">
                For reviewing designs. Nothing here exists in the real app.
              </AppText>

              <AppText variant="headline">Appearance</AppText>
              <View style={[styles.chips, { gap: spacing.sm }]}>
                {APPEARANCES.map((a) => (
                  <Chip
                    key={a.value}
                    label={a.label}
                    selected={schemePreference === a.value}
                    onPress={() => {
                      setSchemePreference(a.value);
                    }}
                  />
                ))}
              </View>

              <AppText variant="headline">Simulation</AppText>
              <Row
                label="Offline"
                value={settings.offline}
                onChange={(offline) => {
                  store.configure({ offline });
                }}
              />
              <Row
                label="Every call fails"
                value={settings.failCalls}
                onChange={(failCalls) => {
                  store.configure({ failCalls });
                }}
              />
              <View style={[styles.chips, { gap: spacing.sm }]}>
                {LATENCIES.map((l) => (
                  <Chip
                    key={l.ms}
                    label={l.label}
                    selected={settings.latencyMs === l.ms}
                    onPress={() => {
                      store.configure({ latencyMs: l.ms });
                    }}
                  />
                ))}
              </View>

              <AppText variant="headline">Account states</AppText>
              <Row
                label="Next verification link has expired"
                value={auth.nextVerificationLink === "expired"}
                onChange={(on) => {
                  setAuth({ nextVerificationLink: on ? "expired" : "valid" });
                }}
              />
              <Row
                label="2 moments waiting to send (sign-out)"
                value={auth.unsentCount > 0}
                onChange={(on) => {
                  setAuth({ unsentCount: on ? 2 : 0 });
                }}
              />
              <Chip
                label="Expire the session now"
                selected={auth.status.kind === "expired"}
                onPress={() => {
                  setAuth({ status: { kind: "expired" } });
                  go("/session-expired");
                }}
              />
              <AppText variant="callout" color="textSecondary">
                Open a reset link
              </AppText>
              <View style={[styles.chips, { gap: spacing.sm }]}>
                {(Object.keys(DEMO_RESET_TOKENS) as (keyof typeof DEMO_RESET_TOKENS)[]).map(
                  (kind) => (
                    <Chip
                      key={kind}
                      label={kind}
                      selected={false}
                      onPress={() => {
                        go({
                          pathname: "/reset-password",
                          params: { token: DEMO_RESET_TOKENS[kind] },
                        });
                      }}
                    />
                  ),
                )}
              </View>

              <AppText variant="headline">Pairing</AppText>
              <View style={[styles.chips, { gap: spacing.sm }]}>
                <Chip
                  label="Your person joins now"
                  selected={false}
                  onPress={() => {
                    pairingDemo.partnerJoins();
                    setOpen(false);
                  }}
                />
                <Chip
                  label="Invitation expires now"
                  selected={false}
                  onPress={() => {
                    pairingDemo.expireInvite();
                    setOpen(false);
                  }}
                />
                <Chip
                  label="Start pairing again"
                  selected={false}
                  onPress={() => {
                    pairingDemo.unpair();
                    setOpen(false);
                    router.replace("/");
                  }}
                />
              </View>

              <AppText variant="headline">Setup</AppText>
              <AppText variant="callout" color="textSecondary">
                Noah's side (the two can never match)
              </AppText>
              <View style={[styles.chips, { gap: spacing.sm }]}>
                {([null, "ruby", "sapphire"] as const).map((side) => (
                  <Chip
                    key={side ?? "none"}
                    label={side === null ? "Not chosen" : side === "ruby" ? "Ruby" : "Sapphire"}
                    selected={partnerSide === side}
                    onPress={() => {
                      setupDemo.partnerPicks(side);
                    }}
                  />
                ))}
                <Chip
                  label="Noah finishes setup"
                  selected={state.profiles.partner.ready}
                  onPress={setupDemo.partnerReady}
                />
              </View>

              <AppText variant="headline">Home</AppText>
              <View style={[styles.chips, { gap: spacing.sm }]}>
                <Chip
                  label="Noah thinks of you"
                  selected={false}
                  onPress={() => {
                    homeDemo.partnerSignals("thought-of-you");
                    setOpen(false);
                  }}
                />
                <Chip
                  label="Noah needs you"
                  selected={false}
                  onPress={() => {
                    homeDemo.partnerSignals("need-you");
                    setOpen(false);
                  }}
                />
              </View>

              <AppText variant="headline">Data</AppText>
              <Chip
                label="Reset demo data"
                selected={false}
                onPress={() => {
                  store.reset();
                  setOpen(false);
                  router.replace("/");
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: touchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 0,
    opacity: 0.8,
  },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "85%" },
  row: { flexDirection: "row", alignItems: "center", minHeight: touchTarget, gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  close: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
