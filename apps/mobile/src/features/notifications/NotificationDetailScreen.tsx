import { router, type Href } from "expo-router";
import { useEffect, useEffectEvent, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { useToast } from "@/components/ui/Toast";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { NOTIFY_GROUPS } from "@/domain/notifications";
import { useHomeToday } from "@/features/home/useHome";
import { SettingsRow, SettingsSection } from "@/features/settings/components/SettingsList";
import { useSettings } from "@/features/settings/useSettings";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { useInbox, useMarkRead, useMarkUnread } from "./useInbox";
import { POP } from "@/theme/transitions";

const MODE_WORDS = {
  immediate: "arrive right away",
  quiet: "arrive quietly",
  scheduled: "come in one gentle summary",
  off: "are off",
} as const;

/**
 * NOTIF-01 details (P-66): one notification, larger, in glass. When it arrived on both clocks,
 * why it came (its group's setting, one tap away), and what to do: open the thing it's about
 * (which checks access again) or keep it unread. Opening it marks it read for this person only.
 */
export function NotificationDetailScreen({ id }: { id: string }) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const toast = useToast();
  const inbox = useInbox();
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const settings = useSettings().data;
  const people = useHomeToday().data;
  const item = inbox.data?.find((i) => i.id === id);
  const unread = item?.unread === true;
  const readOnce = useEffectEvent(() => {
    if (unread) markRead.mutate(id);
  });
  // Opening it reads it, once: a later "Keep unread" must stay.
  const loaded = item !== undefined;
  useEffect(() => {
    if (loaded) readOnce();
  }, [loaded]);

  const frame = (children: ReactNode) => (
    <GlassScreen
      wash="none"
      onBack={() => {
        goBack("/notifications");
      }}
      header={
        <AppText variant="headline" style={styles.center}>
          Notification
        </AppText>
      }
      headerRight={<View style={styles.side} />}
    >
      {children}
    </GlassScreen>
  );
  if (inbox.data === undefined) return frame(<ActivityIndicator accessibilityLabel="Loading" />);
  if (item === undefined)
    return frame(
      <AppText variant="callout" color="textSecondary">
        This notification isn't here anymore.
      </AppText>,
    );

  const at = Temporal.Instant.from(item.at);
  const group = NOTIFY_GROUPS.find((g) => g.id === item.group);
  const mode = settings?.settings.notify[item.group] ?? "immediate";
  const me = people?.me;
  const partner = people?.partner;

  return frame(
    <>
      <Glass radius={radii.xl + 4} tint="garnet" contentStyle={[styles.hero, { gap: spacing.sm }]}>
        <Animated.View
          {...(reduceMotion ? {} : { entering: POP })}
          style={[styles.disc, { backgroundColor: colors.glassVeilSoft }]}
        >
          <AppText style={styles.emoji} accessible={false}>
            {item.emoji}
          </AppText>
        </Animated.View>
        <AppText variant="caption" weight="600" color="accent">
          {item.label.toUpperCase()}
        </AppText>
        <AppText variant="title" style={styles.center}>
          {item.title}
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.center}>
          {item.body}
        </AppText>
      </Glass>

      <SettingsSection title="When">
        {me === undefined ? null : (
          <SettingsRow
            icon="clock"
            tint={palette.ruby500}
            label="For you"
            value={`${localTimeLabel(at, me.zone)} · ${cityForZone(me.zone)}`}
          />
        )}
        {partner === undefined ? null : (
          <SettingsRow
            icon="globe"
            tint={palette.sapphire500}
            label={`For ${partner.name}`}
            value={`${localTimeLabel(at, partner.zone)} · ${cityForZone(partner.zone)}`}
          />
        )}
      </SettingsSection>

      <SettingsSection
        title="Why you got this"
        footer="Only you see this list and what you've opened. Nothing here reaches your partner."
      >
        <SettingsRow
          icon="bell"
          tint={palette.violet500}
          label={group?.title ?? "Notifications"}
          detail={`${group?.title ?? "These"} notifications ${MODE_WORDS[mode]}`}
          onPress={() => {
            router.push("/settings/notifications");
          }}
        />
      </SettingsSection>

      <View style={{ gap: spacing.sm }}>
        <Button
          label="Open"
          variant="primary"
          onPress={() => {
            router.push(item.href as Href);
          }}
        />
        <Button
          label={unread ? "Mark as read" : "Keep unread"}
          variant="secondary"
          onPress={() => {
            if (unread) markRead.mutate(item.id);
            else
              markUnread.mutate(item.id, {
                onSuccess: () => {
                  toast.show("Kept unread.");
                },
              });
          }}
        />
      </View>
    </>,
  );
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
  side: { width: 44, height: 44 },
  hero: { alignItems: "center", padding: 24 },
  disc: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 44, lineHeight: 54 },
});
