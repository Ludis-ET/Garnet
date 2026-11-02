import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import type { EventView, HomePerson } from "@/data/repositories/types";
import { countdownLabel } from "@/domain/events";
import { cityForZone } from "@/domain/identity";
import { memoryDateLabel } from "@/domain/memories";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";

/**
 * Whose colour an event wears (EVT-01): a birthday in that person's gem, an anniversary in
 * Garnet violet (it belongs to both), a visit in sapphire-to-ruby, everything else violet.
 */
export function eventColors(
  e: Pick<EventView, "kind" | "whose">,
  me: HomePerson,
  partner: HomePerson,
): readonly [string, string] {
  const gem = (side: HomePerson["side"]): readonly [string, string] =>
    side === "ruby"
      ? [palette.ruby400, "#8A1538"]
      : side === "sapphire"
        ? [palette.sapphire400, "#1B3A8C"]
        : [palette.violet400, "#4B2BB0"];
  switch (e.kind) {
    case "birthday":
      return gem(e.whose === "me" ? me.side : e.whose === "partner" ? partner.side : null);
    case "travel":
      return [palette.sapphire400, palette.ruby400];
    case "anniversary":
    case "date":
    case "custom":
      return gem(null);
  }
}

/** A faceted gem badge with the event's emoji. Decorative; the row names the event. */
export function EventGem({
  colors,
  emoji,
  size = 46,
}: {
  colors: readonly [string, string];
  emoji: string;
  size?: number;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.gem, { width: size, height: size, borderRadius: size * 0.32 }]}
    >
      <View style={[styles.facet, { borderRadius: size * 0.2 }]} />
      <AppText variant={size > 50 ? "title" : "headline"} accessible={false}>
        {emoji}
      </AppText>
    </LinearGradient>
  );
}

/** "19:00 London · 22:00 Addis Ababa" for timed events (ADR-0002: both zones). */
export function bothZones(e: EventView, me: HomePerson, partner: HomePerson): string | null {
  if (e.times === null) return null;
  return e.times.me === e.times.partner && me.zone === partner.zone
    ? e.times.me
    : `${e.times.me} ${cityForZone(me.zone)} · ${e.times.partner} ${cityForZone(partner.zone)}`;
}

export function EventRow({
  event,
  today,
  me,
  partner,
  onPress,
}: {
  event: EventView;
  today: string;
  me: HomePerson;
  partner: HomePerson;
  onPress: () => void;
}) {
  const { radii, spacing } = useTheme();
  const next = event.next === null ? null : Temporal.PlainDate.from(event.next);
  const zones = bothZones(event, me, partner);
  const when =
    next === null
      ? "Passed"
      : `${memoryDateLabel(next).replace(/ \d{4}$/, "")} · ${countdownLabel(Temporal.PlainDate.from(today), next)}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${when}${zones === null ? "" : `, ${zones}`}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Glass
        radius={radii.xl}
        shadow={false}
        contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
      >
        <EventGem colors={eventColors(event, me, partner)} emoji={event.emoji} />
        <View style={[styles.flex, { gap: 2 }]}>
          <AppText variant="callout" weight="600" numberOfLines={1}>
            {event.title}
          </AppText>
          <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
            {when}
          </AppText>
          {zones === null ? null : (
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {zones}
            </AppText>
          )}
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  gem: { alignItems: "center", justifyContent: "center", transform: [{ rotate: "0deg" }] },
  facet: {
    position: "absolute",
    top: "10%",
    left: "10%",
    width: "42%",
    height: "34%",
    backgroundColor: "rgba(255,255,255,0.32)",
  },
});
