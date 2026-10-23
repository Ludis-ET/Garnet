/**
 * US-01 · Us (Daylight Glass liquid, minimal; P-53). A page for both partners, so Garnet violet;
 * each compose sheet opens in the viewer's own colour. Signals are communication, not
 * measurement: no counts, streaks or "seen" (§5). The partner's open support signal is pinned
 * until answered or until they say they're okay (US-05, US-09). Offline sending is open (U-30):
 * a failed send says so and keeps nothing hidden.
 */
import { SIGNALS, type SignalId } from "@garnet/domain";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { SIGNAL_LOOK } from "@/domain/us";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { useSetupState } from "@/features/setup/useSetup";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { SignalSheet } from "./components/SignalSheet";
import { PeopleBar, SentBurst, SignalRow, SignalTile, SupportCard } from "./components/UsParts";
import { respondedLine } from "./signalText";
import { useRespond, useSendSignalWith, useUsOverview } from "./useUs";

function UsContent() {
  const toast = useToast();
  const { spacing, reduceMotion } = useTheme();
  const now = useNow();
  const overview = useUsOverview();
  const setup = useSetupState();
  const send = useSendSignalWith();
  const respond = useRespond();
  const [compose, setCompose] = useState<SignalId | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ key: number; emoji: string } | null>(null);
  const data = overview.data;
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };

  if (data === undefined)
    return (
      <GlassScreen tabBar>
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );

  const { me, partner } = data;
  const enter = (i: number) =>
    reduceMotion
      ? {}
      : {
          entering: FadeInDown.delay(i * 60)
            .springify()
            .damping(18),
        };
  const avatar = setup.data?.profile.avatar ?? { kind: "initials" as const, swatch: 0 };

  return (
    <View style={styles.fill}>
      <GlassScreen tabBar>
        <Animated.View {...enter(0)} style={[styles.row, { gap: spacing.sm }]}>
          <AppText variant="largeTitle" style={styles.flex}>
            Us
          </AppText>
          <IconButton
            icon="clock"
            label="Signals between you"
            onPress={() => {
              router.push("/us/history");
            }}
          />
        </Animated.View>

        <Animated.View {...enter(1)}>
          <PeopleBar me={me} partner={partner} avatar={avatar} now={now} />
        </Animated.View>

        {data.openSupport === null ? null : (
          <SupportCard
            item={data.openSupport}
            me={me}
            partner={partner}
            busy={respond.isPending}
            onRespond={(response) => {
              const item = data.openSupport;
              if (item === null) return;
              respond.mutate(
                { id: item.id, response },
                {
                  onSuccess: () => {
                    toast.show(respondedLine(response, partner.name), "success");
                  },
                  onError,
                },
              );
            }}
            onMessage={() => {
              toast.show("Messages are designed next.");
            }}
          />
        )}

        <Animated.View {...enter(2)} style={[styles.grid, { rowGap: spacing.md }]}>
          {SIGNALS.map((s) => (
            <SignalTile
              key={s.id}
              emoji={SIGNAL_LOOK[s.id].emoji}
              title={SIGNAL_LOOK[s.id].title}
              onPress={() => {
                setCompose(s.id);
              }}
            />
          ))}
          <SignalTile
            wide
            emoji="💬"
            title="Messages"
            onPress={() => {
              toast.show("Messages are designed next.");
            }}
          />
        </Animated.View>

        {data.recent.length === 0 ? null : (
          <Animated.View {...enter(3)} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <AppText variant="headline" style={styles.flex}>
                Recent
              </AppText>
              <Pressable
                onPress={() => {
                  router.push("/us/history");
                }}
                accessibilityRole="link"
                accessibilityLabel="All signals"
                hitSlop={10}
              >
                <AppText variant="callout" color="accent" weight="600">
                  All
                </AppText>
              </Pressable>
            </View>
            {data.recent.map((item) => (
              <SignalRow
                key={item.id}
                item={item}
                me={me}
                partner={partner}
                expanded={open === item.id}
                onToggle={() => {
                  setOpen(open === item.id ? null : item.id);
                }}
              />
            ))}
          </Animated.View>
        )}
      </GlassScreen>

      {burst === null ? null : (
        <SentBurst
          key={burst.key}
          emoji={burst.emoji}
          color={sideColor(me.side)}
          onDone={() => {
            setBurst(null);
          }}
        />
      )}

      {compose === null ? null : (
        <SideScope side={me.side ?? "garnet"}>
          <SignalSheet
            signal={compose}
            partnerName={partner.name}
            partnerZone={partner.zone}
            sending={send.isPending}
            onClose={() => {
              setCompose(null);
            }}
            onSend={(payload) => {
              const signal = compose;
              send.mutate(
                { signal, payload },
                {
                  onSuccess: () => {
                    setCompose(null);
                    setBurst((b) => ({ key: (b?.key ?? 0) + 1, emoji: SIGNAL_LOOK[signal].emoji }));
                  },
                  onError,
                },
              );
            }}
          />
        </SideScope>
      )}
    </View>
  );
}

export function UsScreen() {
  return (
    <SideScope side="garnet">
      <UsContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Inside GlassScreen's scroll content: grow, never `flex: 1` (rule 11).
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
