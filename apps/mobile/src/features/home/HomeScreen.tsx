/**
 * HOME-01 to HOME-05 · Home (Daylight Glass liquid, minimal; P-53). A shared page, so it renders
 * in Garnet violet with Ruby and Sapphire as the two lights. Only the viewer's own day shows
 * (the partner's waits for the reveal, U-02/U-06); private drafts are marked "Only you"; the
 * waiting item carries no content (A9); senders see "Sent" only (§5); no streaks or scores
 * (U-03/U-04/U-24 open).
 */
import type { SignalId } from "@garnet/domain";
import { useEffect, useEffectEvent, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { daysLabel, greeting } from "@/domain/home";
import { localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { SignOutDialog } from "@/features/auth/SignOutDialog";
import { ProfileAvatar, sideColor } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { useSetupState } from "@/features/setup/useSetup";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { HeroOrb, type HeroPulse } from "./components/HeroOrb";
import { LogSheet } from "./components/LogSheet";
import { MoreSheet } from "./components/MoreSheet";
import { ProfileMenu } from "./components/ProfileMenu";
import { SignalButton } from "./components/SignalButton";
import { incomingLine, QUICK_SIGNALS, signalLabel } from "./signals";
import { useDismissIncoming, useHomeToday, useLogMoment, useSendSignal } from "./useHome";

/** A small, stable number for a string id (spark keys). */
function keyOf(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) + 1;
}

function HomeContent() {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const now = useNow();
  const today = useHomeToday();
  const setup = useSetupState();
  const log = useLogMoment();
  const send = useSendSignal();
  const dismiss = useDismissIncoming();
  const [sheet, setSheet] = useState<"log" | "more" | "menu" | "signout" | null>(null);
  const [myPulse, setMyPulse] = useState<HeroPulse | null>(null);

  const data = today.data;
  const incoming = data?.incoming ?? null;
  const incomingId = incoming?.id ?? null;
  const dismissLater = useEffectEvent((id: string) => {
    dismiss.mutate(id);
  });
  // The partner's signal shows for a moment above the orb, then is dismissed on this phone only.
  useEffect(() => {
    if (incomingId === null) return;
    const timer = setTimeout(() => {
      dismissLater(incomingId);
    }, 3200);
    return () => {
      clearTimeout(timer);
    };
  }, [incomingId]);

  if (data === undefined) {
    return (
      <GlassScreen tabBar>
        <View style={styles.fill}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  }

  const { me, partner } = data;
  const mine = sideColor(me.side);
  const theirs = sideColor(partner.side);
  const pulse: HeroPulse | null =
    incoming === null ? myPulse : { key: keyOf(incoming.id), from: "partner", color: theirs };
  const orb = Math.round(Math.min(width - spacing.gutter * 2, 300));
  const enter = (i: number) =>
    reduceMotion
      ? {}
      : {
          entering: FadeInDown.delay(i * 60)
            .springify()
            .damping(18),
        };
  const sparkle = () => {
    setMyPulse((p) => ({ key: (p?.key ?? 0) + 1, from: "me", color: mine }));
  };
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const sendSignal = (id: SignalId) => {
    send.mutate(id, { onSuccess: sparkle, onError });
  };
  const avatar = setup.data?.profile.avatar ?? { kind: "initials" as const, swatch: 0 };

  return (
    <GlassScreen tabBar>
      {/* Greeting, the two clocks and your picture. */}
      <Animated.View {...enter(0)} style={[styles.row, { gap: spacing.md }]}>
        <View style={[styles.flex, { gap: spacing.sm }]}>
          <AppText variant="question" numberOfLines={1}>
            {greeting(now, me.zone, me.name)}
          </AppText>
          <Glass
            radius={radii.pill}
            shadow={false}
            style={styles.self}
            contentStyle={[styles.row, styles.clocks, { gap: spacing.sm }]}
          >
            <View style={[styles.dot, { backgroundColor: mine }]} />
            <AppText variant="caption" weight="600">
              {localTimeLabel(now, me.zone)}
            </AppText>
            <View style={[styles.dot, { backgroundColor: theirs }]} />
            <AppText variant="caption" weight="600">
              {localTimeLabel(now, partner.zone)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {partner.name}
            </AppText>
          </Glass>
        </View>
        <Pressable
          onPress={() => {
            setSheet("menu");
          }}
          accessibilityRole="button"
          accessibilityLabel="Profile menu"
          hitSlop={6}
        >
          <ProfileAvatar name={me.name} avatar={avatar} side={me.side} size={48} />
        </Pressable>
      </Animated.View>

      {/* The hero, and Noah's signal floating above it. */}
      <Animated.View {...enter(1)} style={styles.center}>
        <HeroOrb size={orb} pulse={pulse} />
        {incoming === null ? null : (
          <Animated.View
            key={incoming.id}
            {...(reduceMotion
              ? {}
              : { entering: FadeInUp.springify().damping(16), exiting: FadeOutUp })}
            accessibilityLiveRegion="polite"
            style={styles.incoming}
          >
            <Glass
              radius={radii.pill}
              contentStyle={[styles.row, styles.capsule, { gap: spacing.xs }]}
            >
              <View style={[styles.dot, { backgroundColor: theirs }]} />
              <AppText variant="callout" weight="600">
                {incomingLine(incoming.signal, partner.name)}
              </AppText>
            </Glass>
          </Animated.View>
        )}
      </Animated.View>

      {/* Hold-to-send signals. */}
      <Animated.View {...enter(2)} style={{ gap: spacing.md }}>
        <View style={styles.signals}>
          {QUICK_SIGNALS.map((s) => (
            <SignalButton
              key={s.id}
              emoji={s.emoji}
              word={s.word}
              label={signalLabel(s.id)}
              partnerName={partner.name}
              onSend={() => {
                sendSignal(s.id);
              }}
            />
          ))}
          <Pressable
            onPress={() => {
              setSheet("more");
            }}
            accessibilityRole="button"
            accessibilityLabel="More signals"
            style={styles.moreCol}
          >
            <Glass radius={32} contentStyle={styles.more}>
              <Icon name="plus" size={22} color={colors.textSecondary} />
            </Glass>
            <AppText variant="caption" color="textSecondary">
              More
            </AppText>
          </Pressable>
        </View>
        <Button
          label="Log a moment"
          onPress={() => {
            setSheet("log");
          }}
        />
      </Animated.View>

      {/* Today: your own moments only. */}
      <Animated.View {...enter(3)} style={{ gap: spacing.sm }}>
        <AppText variant="headline">Today</AppText>
        {data.moments.length === 0 ? (
          <AppText variant="callout" color="textSecondary">
            Your day starts here.
          </AppText>
        ) : (
          data.moments.slice(0, 3).map((m) => (
            <Glass
              key={m.id}
              radius={radii.lg}
              shadow={false}
              contentStyle={[styles.row, styles.moment, { gap: spacing.md }]}
            >
              <AppText variant="footnote" color="textTertiary" style={styles.time}>
                {localTimeLabel(Temporal.Instant.from(m.at), me.zone)}
              </AppText>
              <AppText variant="body">{m.emoji}</AppText>
              <AppText variant="callout" numberOfLines={1} style={styles.flex}>
                {m.text}
              </AppText>
              {m.visibility !== "private" ? null : (
                <View accessible accessibilityLabel="Only you" style={[styles.row, { gap: 2 }]}>
                  <Icon name="lock" size={13} color={colors.textTertiary} />
                  <AppText variant="caption" color="textTertiary">
                    Only you
                  </AppText>
                </View>
              )}
            </Glass>
          ))
        )}
      </Animated.View>

      {/* One upcoming thing and one waiting thing, side by side. */}
      {data.event === null && !data.waiting ? null : (
        <Animated.View {...enter(4)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md }}
          >
            {data.event === null ? null : (
              <Glass radius={radii.xl} contentStyle={[styles.card, { gap: spacing.xs }]}>
                <AppText variant="title">{data.event.emoji}</AppText>
                <AppText variant="callout" weight="600" numberOfLines={1}>
                  {data.event.title}
                </AppText>
                <AppText variant="footnote" color="textSecondary">
                  {daysLabel(data.event.daysAway)}
                </AppText>
              </Glass>
            )}
            {data.waiting ? (
              <Pressable
                onPress={() => {
                  toast.show("Open When is designed next.");
                }}
                accessibilityRole="button"
                accessibilityLabel="Something's waiting for you"
              >
                <Glass
                  radius={radii.xl}
                  tint="garnet"
                  contentStyle={[styles.card, { gap: spacing.xs }]}
                >
                  <AppText variant="title">💜</AppText>
                  <AppText variant="callout" weight="600">
                    Something's waiting
                  </AppText>
                  <AppText variant="footnote" color="textSecondary">
                    For you
                  </AppText>
                </Glass>
              </Pressable>
            ) : null}
          </ScrollView>
        </Animated.View>
      )}

      <LogSheet
        visible={sheet === "log"}
        partnerName={partner.name}
        saving={log.isPending}
        onSave={(moment) => {
          log.mutate(moment, {
            onSuccess: () => {
              setSheet(null);
              sparkle();
              toast.show(
                moment.share ? `Shared with ${partner.name}.` : "Kept private.",
                "success",
              );
            },
            onError,
          });
        }}
        onClose={(unsaved) => {
          setSheet(null);
          if (unsaved === null) return;
          log.mutate(
            { ...unsaved, share: false },
            {
              onSuccess: () => {
                toast.show("Kept as a draft.");
              },
              onError,
            },
          );
        }}
      />
      <MoreSheet
        visible={sheet === "more"}
        partnerName={partner.name}
        onSend={sendSignal}
        onClose={() => {
          setSheet(null);
        }}
      />
      <ProfileMenu
        visible={sheet === "menu"}
        name={me.name}
        side={me.side}
        avatar={avatar}
        onClose={() => {
          setSheet(null);
        }}
        onSettings={() => {
          setSheet(null);
          toast.show("Settings are designed next.");
        }}
        onSignOut={() => {
          setSheet("signout");
        }}
      />
      <SignOutDialog
        visible={sheet === "signout"}
        onClose={() => {
          setSheet(null);
        }}
      />
    </GlassScreen>
  );
}

/** Home is a shared page: Garnet violet throughout, Ruby and Sapphire as the two lights. */
export function HomeScreen() {
  return (
    <SideScope side="garnet">
      <HomeContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  self: { alignSelf: "flex-start" },
  clocks: { paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: "center" },
  incoming: { position: "absolute", top: 8, alignSelf: "center" },
  capsule: { paddingHorizontal: 14, paddingVertical: 8 },
  signals: { flexDirection: "row", justifyContent: "space-between" },
  moreCol: { alignItems: "center", gap: 6, minWidth: 64 },
  more: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  moment: { paddingHorizontal: 14, minHeight: 50 },
  time: { width: 42 },
  card: { width: 156, padding: 16 },
});
