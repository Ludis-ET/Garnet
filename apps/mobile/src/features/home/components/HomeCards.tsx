import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { CountBadge } from "@/components/ui/CountBadge";
import { Glass, type GlassTint } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useCountUp } from "@/components/ui/useCountUp";
import type { HomePerson, HomeToday, MomentView } from "@/data/repositories/types";
import type { ChatMessage } from "@/domain/chat";
import { messagePreview } from "@/domain/chat";
import { formatKm } from "@/domain/distance";
import { aboutDuration, bothAwake, dayPhaseEmoji } from "@/domain/home";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { MediaArt } from "@/features/days/components/MediaArt";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, LAYOUT } from "@/theme/transitions";

/** Springs in after the ones before it, and glides when its neighbours come and go. */
function useEnter() {
  const { reduceMotion } = useTheme();
  return reduceMotion
    ? {}
    : {
        entering: ENTER,
        layout: LAYOUT,
      };
}

/**
 * A pressable glass tile for Home (P-66): it sinks a little under the finger and springs back.
 * The label says everything the tile shows.
 */
export function Tile({
  label,
  onPress,
  tint = "none",
  style,
  contentStyle,
  children,
}: {
  index: number;
  label: string;
  onPress: () => void;
  tint?: GlassTint;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { radii, motion, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const to = (v: number) => {
    scale.set(reduceMotion ? v : withSpring(v, motion.spring.bouncy));
  };
  return (
    <Animated.View {...useEnter()} style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          to(0.965);
        }}
        onPressOut={() => {
          to(1);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View style={pressed}>
          <Glass radius={radii.xl + 2} tint={tint} contentStyle={contentStyle}>
            {children}
          </Glass>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** A soft light that slides across a card every few seconds. Off under reduced motion. */
function Sheen() {
  const { reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || w === 0) return;
    x.set(
      withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }), -1, false),
    );
  }, [reduceMotion, w, x]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + x.get() * w * 2 }, { rotate: "18deg" }],
  }));
  if (reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
      }}
    >
      <Animated.View style={[styles.sheen, { width: w * 0.5 }, style]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** "Right now": both clocks, the part of each day, and when you're both awake (P-66). */
export function RightNowCard({
  index,
  me,
  partner,
  now,
  km,
  onPress,
}: {
  index: number;
  me: HomePerson;
  partner: HomePerson;
  now: Temporal.Instant;
  km: { km: number; approximate: boolean } | null;
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  const awake = bothAwake(now, me.zone, partner.zone);
  const line = awake.now
    ? `You're both awake for ${aboutDuration(awake.minutesLeft)}. A good time to call.`
    : awake.minutesUntil === null
      ? "Your days hardly overlap right now."
      : `Both awake again in ${aboutDuration(awake.minutesUntil)}.`;
  const clock = (p: HomePerson, who: string) => (
    <View style={[styles.flex, { gap: 2 }]}>
      <AppText variant="caption" color="textSecondary">
        {dayPhaseEmoji(now, p.zone)} {who}
      </AppText>
      <AppText variant="largeTitle" style={styles.tabular}>
        {localTimeLabel(now, p.zone)}
      </AppText>
      <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
        {cityForZone(p.zone)}
      </AppText>
    </View>
  );
  return (
    <Tile
      index={index}
      tint="garnet"
      onPress={onPress}
      label={`Right now. ${me.name} ${localTimeLabel(now, me.zone)}, ${partner.name} ${localTimeLabel(now, partner.zone)}. ${line}${km === null ? "" : ` ${km.approximate ? "About " : ""}${formatKm(km.km)} kilometres apart.`}`}
      contentStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Sheen />
      <View style={styles.row}>
        <AppText variant="footnote" weight="600" color="textSecondary" style={styles.flex}>
          Right now
        </AppText>
        {km === null ? null : (
          <View style={[styles.chip, { backgroundColor: colors.glassVeilSoft, gap: 4 }]}>
            <Icon name="plane" size={12} color={colors.accent} />
            <AppText variant="caption" weight="600">
              {km.approximate ? "≈ " : ""}
              {formatKm(km.km)} km
            </AppText>
          </View>
        )}
      </View>
      <View style={[styles.row, { gap: spacing.md }]}>
        {clock(me, "You")}
        <View style={[styles.divider, { backgroundColor: colors.glassHairline }]} />
        {clock(partner, partner.name)}
      </View>
      <View style={[styles.row, { gap: spacing.xs }]}>
        <Icon name="clock" size={15} color={awake.now ? colors.success : colors.textSecondary} />
        <AppText variant="footnote" weight="600" style={styles.flex}>
          {line}
        </AppText>
      </View>
    </Tile>
  );
}

/** Messages: unread count (this person's own) and the latest message. */
export function MessagesTile({
  index,
  partner,
  unread,
  last,
  onPress,
}: {
  index: number;
  partner: HomePerson;
  unread: number;
  last: ChatMessage | null;
  onPress: () => void;
}) {
  const { spacing } = useTheme();
  return (
    <Tile
      index={index}
      onPress={onPress}
      style={styles.flex}
      label={`Messages with ${partner.name}${unread > 0 ? `, ${String(unread)} unread` : ""}`}
      contentStyle={[styles.square, { padding: spacing.lg, gap: spacing.sm }]}
    >
      <View>
        <ProfileAvatar
          name={partner.name}
          avatar={partner.avatar ?? { kind: "initials", swatch: 1 }}
          side={partner.side}
          size={44}
        />
        <CountBadge count={unread} style={styles.avatarBadge} />
      </View>
      <View style={styles.grow} />
      <AppText variant="headline">{unread > 0 ? `${String(unread)} new` : "Messages"}</AppText>
      <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
        {last === null ? "Say hello 💜" : messagePreview(last)}
      </AppText>
    </Tile>
  );
}

/** Coming up: the next event and a day count that counts down into place. */
export function UpcomingTile({
  index,
  event,
  onPress,
}: {
  index: number;
  event: NonNullable<HomeToday["event"]>;
  onPress: () => void;
}) {
  const { spacing, reduceMotion } = useTheme();
  const days = useCountUp(event.daysAway, reduceMotion, 900);
  const when =
    event.daysAway === 0
      ? "Today"
      : event.daysAway === 1
        ? "Tomorrow"
        : `${String(event.daysAway)} days`;
  return (
    <Tile
      index={index}
      onPress={onPress}
      style={styles.flex}
      label={`Coming up: ${event.title}, ${when}`}
      contentStyle={[styles.square, { padding: spacing.lg, gap: spacing.xs }]}
    >
      <AppText variant="title" accessible={false}>
        {event.emoji}
      </AppText>
      <View style={styles.grow} />
      {event.daysAway > 1 ? (
        <View style={[styles.row, styles.baseline, { gap: 4 }]}>
          <AppText variant="largeTitle" serif style={styles.tabular}>
            {String(Math.round(days))}
          </AppText>
          <AppText variant="callout" color="textSecondary">
            days
          </AppText>
        </View>
      ) : (
        <AppText variant="title" serif>
          {when}
        </AppText>
      )}
      <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
        {event.title}
      </AppText>
    </Tile>
  );
}

/** Waiting for you: letters this person may open now, or a nudge to write one. */
export function LettersTile({
  index,
  count,
  onOpen,
  onWrite,
}: {
  index: number;
  count: number;
  onOpen: () => void;
  onWrite: () => void;
}) {
  const { spacing } = useTheme();
  return (
    <Tile
      index={index}
      onPress={count > 0 ? onOpen : onWrite}
      tint={count > 0 ? "garnet" : "none"}
      style={styles.flex}
      label={
        count > 0
          ? `Something's waiting for you: ${String(count)} ${count === 1 ? "letter" : "letters"} to open`
          : "Write an Open When letter"
      }
      contentStyle={[styles.square, { padding: spacing.lg, gap: spacing.xs }]}
    >
      <View style={styles.self}>
        <AppText variant="title" accessible={false}>
          💌
        </AppText>
        <CountBadge count={count} style={styles.emojiBadge} />
      </View>
      <View style={styles.grow} />
      <AppText variant="headline">{count > 0 ? "Waiting for you" : "Open When"}</AppText>
      <AppText variant="footnote" color="textSecondary">
        {count > 0 ? `${String(count)} ready to open` : "Write one for later"}
      </AppText>
    </Tile>
  );
}

/** A memory to revisit today: its picture fills the tile, the title on a soft shade. */
export function MemoryTile({
  index,
  memory,
  zone,
  onPress,
}: {
  index: number;
  memory: NonNullable<HomeToday["memory"]>;
  zone: string;
  onPress: () => void;
}) {
  const { spacing, radii } = useTheme();
  const date = Temporal.PlainDate.from(memory.date);
  const ago = date.until(Temporal.Now.plainDateISO(zone)).days;
  const when = ago <= 0 ? "Today" : ago === 1 ? "Yesterday" : `${String(ago)} days ago`;
  return (
    <Tile
      index={index}
      onPress={onPress}
      style={styles.flex}
      label={`A memory: ${memory.title}, ${when}`}
      contentStyle={styles.square}
    >
      {memory.art === null ? (
        <View style={[styles.fillCenter, { padding: spacing.lg }]}>
          <AppText variant="title">📸</AppText>
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <MediaArt art={memory.art} height={168} radius={radii.xl} />
        </View>
      )}
      <Sheen />
      <LinearGradient
        colors={["rgba(10,8,20,0)", "rgba(10,8,20,0.55)"]}
        style={[styles.shade, { padding: spacing.md }]}
      >
        <AppText variant="caption" style={styles.whiteSoft}>
          {when}
        </AppText>
        <AppText variant="headline" numberOfLines={2} style={styles.white}>
          {memory.title}
        </AppText>
      </LinearGradient>
    </Tile>
  );
}

/** Today: this person's own moments on a little timeline (never the partner's, U-02). */
export function TodayCard({
  index,
  zone,
  moments,
  onPress,
}: {
  index: number;
  zone: string;
  moments: readonly MomentView[];
  onPress: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Tile
      index={index}
      onPress={onPress}
      label={`Today: ${
        moments.length === 0
          ? "nothing yet"
          : moments
              .slice(0, 4)
              .map(
                (m) =>
                  `${localTimeLabel(Temporal.Instant.from(m.at), zone)} ${m.text}${m.visibility === "private" ? ", only you" : ""}`,
              )
              .join("; ")
      }. Open your day`}
      contentStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <View style={styles.row}>
        <AppText variant="headline" style={styles.flex}>
          Today
        </AppText>
        <AppText variant="footnote" weight="600" color="accent">
          Your day
        </AppText>
        <Icon name="chevron-right" size={14} color={colors.accent} />
      </View>
      {moments.length === 0 ? (
        <AppText variant="callout" color="textSecondary">
          Your day starts here.
        </AppText>
      ) : (
        <View>
          {moments.slice(0, 4).map((m, i, all) => (
            <View key={m.id} style={[styles.row, { gap: spacing.md }]}>
              <View style={styles.rail}>
                <View style={[styles.node, { backgroundColor: colors.accent }]} />
                {i === all.length - 1 ? null : (
                  <View style={[styles.line, { backgroundColor: colors.glassHairline }]} />
                )}
              </View>
              <View style={[styles.flex, styles.row, styles.momentRow, { gap: spacing.sm }]}>
                <AppText variant="footnote" color="textTertiary" style={styles.time}>
                  {localTimeLabel(Temporal.Instant.from(m.at), zone)}
                </AppText>
                <AppText variant="body" accessible={false}>
                  {m.emoji}
                </AppText>
                <AppText variant="callout" numberOfLines={1} style={styles.flex}>
                  {m.text}
                </AppText>
                {m.visibility !== "private" ? null : (
                  <View accessible accessibilityLabel="Only you" style={[styles.row, { gap: 2 }]}>
                    <Icon name="lock" size={12} color={colors.textTertiary} />
                    <AppText variant="caption" color="textTertiary">
                      Only you
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Tile>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  self: { alignSelf: "flex-start" },
  row: { flexDirection: "row", alignItems: "center" },
  baseline: { alignItems: "baseline" },
  tabular: { fontVariant: ["tabular-nums"] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  square: { height: 168, overflow: "hidden" },
  avatarBadge: { position: "absolute", top: -6, right: -10 },
  emojiBadge: { position: "absolute", top: -6, right: -16 },
  fillCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  shade: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 28 },
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.85)" },
  sheen: { position: "absolute", top: -40, bottom: -40 },
  rail: { width: 12, alignItems: "center", alignSelf: "stretch" },
  node: { width: 9, height: 9, borderRadius: 5, marginTop: 15 },
  line: { width: 2, flex: 1, marginTop: 2 },
  momentRow: { minHeight: 40 },
  time: { width: 40 },
});
