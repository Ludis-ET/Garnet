import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import type { AvatarChoice } from "@/data/fixtures/demoProfile";
import type { HomePerson, SignalItem } from "@/data/repositories/types";
import { localTimeLabel } from "@/domain/identity";
import {
  RESPONSE_LABEL,
  receivedLine,
  responsesFor,
  sentLine,
  SIGNAL_LOOK,
  type SignalResponse,
} from "@/domain/us";
import { ProfileAvatar, sideColor } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { payloadLines, replyLine } from "../signalText";

/**
 * US-01 top: both of you, each ringed in their side's colour, with a thin violet line between
 * and a small light travelling along it. Each person's local time underneath.
 */
export function PeopleBar({
  me,
  partner,
  avatar,
  now,
}: {
  me: HomePerson;
  partner: HomePerson;
  avatar: AvatarChoice;
  now: Temporal.Instant;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [t, reduceMotion]);
  const from = sideColor(me.side);
  const to = sideColor(partner.side);
  const light = useAnimatedStyle(() => ({
    transform: [{ translateX: t.get() * Math.max(0, width - 10) }],
    backgroundColor: interpolateColor(t.get(), [0, 1], [from, to]),
  }));
  const person = (p: HomePerson, a: AvatarChoice) => (
    <View style={[styles.person, { gap: spacing.xs }]}>
      <ProfileAvatar name={p.name} avatar={a} side={p.side} size={64} />
      <AppText variant="callout" weight="600" numberOfLines={1}>
        {p.name}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {localTimeLabel(now, p.zone)}
      </AppText>
    </View>
  );
  return (
    <Glass radius={radii.xl} contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.sm }]}>
      <View
        accessible
        accessibilityLabel={`${me.name}, ${localTimeLabel(now, me.zone)}. ${partner.name}, ${localTimeLabel(now, partner.zone)}.`}
        style={[styles.row, styles.flex, { gap: spacing.sm }]}
      >
        {person(me, avatar)}
        <View
          style={[styles.link, { backgroundColor: colors.tintGarnet }]}
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
          }}
        >
          <Animated.View style={[styles.light, light]} />
        </View>
        {person(partner, { kind: "initials", swatch: 1 })}
      </View>
    </Glass>
  );
}

/** A signal tile in the 2-column grid: big emoji, title, a soft press. */
export function SignalTile({
  emoji,
  title,
  onPress,
  wide = false,
}: {
  emoji: string;
  title: string;
  onPress: () => void;
  wide?: boolean;
}) {
  const { radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        wide ? styles.wide : styles.tile,
        { transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Glass
        radius={radii.xl}
        contentStyle={[
          wide ? styles.wideInner : styles.tileInner,
          { padding: spacing.lg, gap: spacing.sm },
        ]}
      >
        <AppText variant="title" accessible={false}>
          {emoji}
        </AppText>
        <AppText variant="callout" weight="600" numberOfLines={2}>
          {title}
        </AppText>
      </Glass>
    </Pressable>
  );
}

/** "18:42 · 20:42 for you": the sender's time, then the viewer's when the zones differ. */
export function bothTimes(at: string, from: HomePerson, viewer: HomePerson): string {
  const i = Temporal.Instant.from(at);
  const theirs = localTimeLabel(i, from.zone);
  const mine = localTimeLabel(i, viewer.zone);
  return theirs === mine ? theirs : `${theirs} · ${mine} for you`;
}

/**
 * US-05 · The partner's open support signal, pinned gently at the top of Us: what they need,
 * their words, both times, and replies. Calm, not alarming; no call buttons (A13).
 */
export function SupportCard({
  item,
  me,
  partner,
  busy,
  onRespond,
  onMessage,
}: {
  item: SignalItem;
  me: HomePerson;
  partner: HomePerson;
  busy: boolean;
  onRespond: (r: SignalResponse) => void;
  onMessage: () => void;
}) {
  const { radii, spacing } = useTheme();
  const replies = responsesFor(item.signal);
  const title = receivedLine(item.signal, partner.name, item.payload);
  const details = payloadLines(item.payload, title);
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition}
    >
      <Glass
        radius={radii.xl}
        tint={partner.side ?? "garnet"}
        contentStyle={{ padding: spacing.xl, gap: spacing.md }}
      >
        <View accessibilityLiveRegion="polite" style={[styles.row, { gap: spacing.md }]}>
          <AppText variant="title" accessible={false}>
            {SIGNAL_LOOK[item.signal].emoji}
          </AppText>
          <View style={styles.flex}>
            <AppText variant="headline">
              {receivedLine(item.signal, partner.name, item.payload)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {bothTimes(item.at, partner, me)}
            </AppText>
          </View>
        </View>
        {details.length === 0 ? null : (
          <AppText variant="callout" color="textSecondary">
            {details.join(" · ")}
          </AppText>
        )}
        {item.payload.note === undefined ? null : (
          <AppText variant="callout" serif italic>
            “{item.payload.note}”
          </AppText>
        )}
        <View style={{ gap: spacing.sm }}>
          {replies.map((r, i) => (
            <Button
              key={r}
              label={RESPONSE_LABEL[r]}
              variant={i === 0 ? "primary" : "secondary"}
              disabled={busy}
              onPress={() => {
                onRespond(r);
              }}
            />
          ))}
          <Button label="Message" variant="text" onPress={onMessage} />
        </View>
      </Glass>
    </Animated.View>
  );
}

/** One history line (US-01 recent, US-10). Tap to see the words and replies. */
export function SignalRow({
  item,
  me,
  partner,
  expanded,
  onToggle,
}: {
  item: SignalItem;
  me: HomePerson;
  partner: HomePerson;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { radii, spacing } = useTheme();
  // The ring is the sender's colour; the line itself names who sent it (never colour alone).
  const from = item.mine ? me : partner;
  const line = item.mine
    ? sentLine(item.signal)
    : receivedLine(item.signal, partner.name, item.payload);
  const details = payloadLines(item.payload, line);
  const replier = item.mine ? partner.name : "You";
  return (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={line}
        accessibilityState={{ expanded }}
      >
        <Glass
          radius={radii.lg}
          shadow={false}
          contentStyle={{ padding: spacing.md, gap: spacing.sm }}
        >
          <View style={[styles.row, { gap: spacing.md }]}>
            <View style={[styles.disc, { borderColor: sideColor(from.side) }]}>
              <AppText variant="body" accessible={false}>
                {SIGNAL_LOOK[item.signal].emoji}
              </AppText>
            </View>
            <AppText variant="callout" style={styles.flex} numberOfLines={expanded ? 4 : 1}>
              {line}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              {localTimeLabel(Temporal.Instant.from(item.at), me.zone)}
            </AppText>
          </View>
          {expanded ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.detail, { gap: spacing.xs }]}
            >
              {details.map((d) => (
                <AppText key={d} variant="footnote" color="textSecondary">
                  {d}
                </AppText>
              ))}
              {item.payload.note === undefined ? null : (
                <AppText variant="callout" serif italic>
                  “{item.payload.note}”
                </AppText>
              )}
              {item.responses.map((r, i) => (
                <AppText key={`${r}-${i}`} variant="footnote" color="accent" weight="600">
                  {replyLine(r, replier)}
                </AppText>
              ))}
              <AppText variant="caption" color="textTertiary">
                {bothTimes(item.at, from, me)}
              </AppText>
              {details.length === 0 &&
              item.payload.note === undefined &&
              item.responses.length === 0 ? (
                <AppText variant="footnote" color="textTertiary">
                  Just the signal.
                </AppText>
              ) : null}
            </Animated.View>
          ) : null}
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/**
 * US-02 sent: a small light in the sender's colour rises and turns Garnet violet, then "Sent 💭".
 * Mount it (with a new key) for each send; it calls `onDone` when finished. No "seen" (§5).
 * Reduced motion: the words fade in on their own.
 */
export function SentBurst({
  emoji,
  color,
  onDone,
}: {
  emoji: string;
  color: string;
  onDone: () => void;
}) {
  const { colors, reduceMotion } = useTheme();
  const p = useSharedValue(0);
  const words = useSharedValue(0);
  const finish = useEffectEvent(onDone);
  useEffect(() => {
    p.set(withTiming(1, { duration: reduceMotion ? 1 : 900, easing: Easing.out(Easing.cubic) }));
    words.set(withDelay(reduceMotion ? 0 : 500, withTiming(1, { duration: 260 })));
    const timer = setTimeout(() => {
      finish();
    }, 1800);
    return () => {
      clearTimeout(timer);
    };
  }, [p, words, reduceMotion]);
  const garnet = colors.garnet;
  const orb = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0 : 1 - p.get() * 0.4,
    transform: [{ translateY: -150 * p.get() }, { scale: 0.6 + p.get() * 0.8 }],
    backgroundColor: interpolateColor(p.get(), [0, 1], [color, garnet]),
    shadowColor: interpolateColor(p.get(), [0, 1], [color, garnet]),
  }));
  const text = useAnimatedStyle(() => ({
    opacity: words.get(),
    transform: [{ scale: 0.9 + words.get() * 0.1 }],
  }));
  return (
    <View pointerEvents="none" style={styles.burst}>
      <Animated.View style={[styles.orb, orb]} />
      <Animated.View style={text} accessibilityLiveRegion="polite">
        <Glass radius={999} contentStyle={styles.sent}>
          <AppText variant="headline">Sent {emoji}</AppText>
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  person: { alignItems: "center", width: 96 },
  link: { flex: 1, height: 3, borderRadius: 2, marginBottom: 40, justifyContent: "center" },
  light: { width: 10, height: 10, borderRadius: 5 },
  tile: { width: "48%" },
  tileInner: { minHeight: 112, justifyContent: "space-between" },
  wide: { width: "100%" },
  wideInner: { flexDirection: "row", alignItems: "center" },
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  detail: { paddingLeft: 52 },
  burst: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  sent: { paddingHorizontal: 22, paddingVertical: 12 },
});
