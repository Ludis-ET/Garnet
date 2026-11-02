import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import type { InboxItem } from "@/data/repositories/types";
import { localTimeLabel } from "@/domain/identity";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { useInbox, useMarkAllRead } from "./useInbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER } from "@/theme/transitions";

function dayLabel(at: string, zone: string): string {
  const d = Temporal.Instant.from(at).toZonedDateTimeISO(zone).toPlainDate();
  const diff = d.until(Temporal.Now.plainDateISO(zone)).days;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * NOTIF-01 · Notification centre (prompt 17, Daylight Glass P-63): grouped by day, each row a
 * glass card with its picture, safe title and body, and the time. The dot means unread for this
 * person only; it never tells the partner anything (§5). Tapping opens the place it's about,
 * which checks access again. "You're all caught up" when there's nothing.
 */
export function NotificationCentreScreen() {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const inbox = useInbox();
  const markAll = useMarkAllRead();
  const me = useHomeToday().data?.me;
  const zone = me?.zone ?? "UTC";
  const items = inbox.data ?? [];
  const unread = items.filter((i) => i.unread).length;
  const days: { label: string; items: InboxItem[] }[] = [];
  for (const i of items) {
    const label = dayLabel(i.at, zone);
    const group = days.find((d) => d.label === label);
    if (group === undefined) days.push({ label, items: [i] });
    else group.items.push(i);
  }

  return (
    <GlassScreen
      wash="none"
      onBack={() => {
        goBack("/home");
      }}
      header={
        <AppText variant="headline" style={styles.center}>
          Notifications
        </AppText>
      }
      headerRight={
        unread > 0 ? (
          <Pressable
            onPress={() => {
              markAll.mutate(undefined);
            }}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            hitSlop={8}
          >
            <AppText variant="footnote" weight="600" color="accent">
              Mark all read
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.side} />
        )
      }
    >
      {inbox.data === undefined ? (
        <Skeleton kind="timeline" />
      ) : items.length === 0 ? (
        <View style={[styles.empty, { gap: spacing.sm }]}>
          <CharacterSlot
            character={me?.side ?? "garnet"}
            look={{ mood: "happy", occasion: "everyday" }}
            size={150}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText variant="title">You're all caught up</AppText>
          <AppText variant="callout" color="textSecondary">
            New things will gather here, gently.
          </AppText>
        </View>
      ) : (
        days.map((d) => (
          <View key={d.label} style={{ gap: spacing.xs }}>
            <AppText
              variant="caption"
              weight="600"
              color="textSecondary"
              accessibilityRole="header"
            >
              {d.label.toUpperCase()}
            </AppText>
            {d.items.map((i) => (
              <Animated.View
                key={i.id}
                {...(reduceMotion
                  ? {}
                  : {
                      entering: ENTER,
                    })}
              >
                <Pressable
                  onPress={() => {
                    router.push({ pathname: "/notifications/[id]", params: { id: i.id } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${i.unread ? "Unread. " : ""}${i.title}. ${i.body}. ${localTimeLabel(Temporal.Instant.from(i.at), zone)}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Glass
                    radius={radii.xl}
                    shadow={i.unread}
                    tint={i.unread ? "garnet" : "none"}
                    contentStyle={[styles.item, { gap: spacing.md }]}
                  >
                    <View style={[styles.disc, { backgroundColor: colors.glassVeilSoft }]}>
                      <AppText variant="title" accessible={false}>
                        {i.emoji}
                      </AppText>
                    </View>
                    <View style={[styles.flex, { gap: 2 }]}>
                      <AppText variant="callout" weight="600" numberOfLines={1}>
                        {i.title}
                      </AppText>
                      <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
                        {i.body}
                      </AppText>
                    </View>
                    <View style={[styles.meta, { gap: 6 }]}>
                      <AppText variant="caption" color="textTertiary">
                        {localTimeLabel(Temporal.Instant.from(i.at), zone)}
                      </AppText>
                      {i.unread ? (
                        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                      ) : null}
                    </View>
                  </Glass>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ))
      )}
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  side: { width: 44, height: 44 },
  empty: { alignItems: "center", paddingTop: 40 },
  item: { flexDirection: "row", alignItems: "center", padding: 14 },
  disc: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  meta: { alignItems: "flex-end" },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
