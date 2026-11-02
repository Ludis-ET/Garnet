import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import {
  NOTIFICATION_CATALOGUE,
  NOTIFY_GROUPS,
  renderNotification,
  type NotifyGroup,
  type PreviewMode,
} from "@/domain/notifications";
import {
  greetingLine,
  NOTIFY_MODES,
  SUGGESTED_QUIET_HOURS,
  type ReminderLevel,
  type UserSettings,
} from "@/domain/settings";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { NotificationMock } from "@/features/notifications/NotificationMock";
import { useSaveSetup, useSetupState } from "@/features/setup/useSetup";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import { useSettings, useUpdateSettings } from "../useSettings";

/** Settings plus a saver that toasts on failure (each change saves at once, like iOS). */
function useEditable() {
  const toast = useToast();
  const data = useSettings().data;
  const update = useUpdateSettings();
  const set = (patch: Partial<UserSettings>) => {
    update.mutate(patch, {
      onError: (e: unknown) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };
  return { data, set };
}

function Loading({ title }: { title: string }) {
  return (
    <SettingsPage title={title}>
      <ActivityIndicator accessibilityLabel="Loading" />
    </SettingsPage>
  );
}

/** A radio card: a title, a line about it, and (optionally) a picture of it. */
function Choice({
  title,
  detail,
  selected,
  onPress,
  badge,
  children,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
  badge?: string;
  children?: ReactNode;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Glass
        radius={radii.xl}
        shadow={selected}
        tint={selected ? "garnet" : "none"}
        contentStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <View style={[styles.row, { gap: spacing.xs }]}>
              <AppText variant="headline">{title}</AppText>
              {badge === undefined ? null : (
                <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                  <AppText variant="caption" weight="600" color="accent">
                    {badge}
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="footnote" color="textSecondary">
              {detail}
            </AppText>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: selected ? colors.accent : colors.glassRimEnd,
                backgroundColor: selected ? colors.accent : "transparent",
              },
            ]}
          >
            {selected ? <Icon name="check" size={13} color={colors.onAccent} /> : null}
          </View>
        </View>
        {children}
      </Glass>
    </Pressable>
  );
}

/** SET-03 · Appearance: scheme and colour richness, with a live preview. */
export function AppearancePage() {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const setup = useSetupState().data;
  const save = useSaveSetup();
  const settings = useSettings().data;
  if (setup === undefined || settings === undefined) return <Loading title="Appearance" />;
  const p = setup.profile;
  const set = (patch: Parameters<typeof save.mutate>[0]) => {
    save.mutate(patch, {
      onError: (e: unknown) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };
  const hour = Temporal.Now.zonedDateTimeISO(p.timeZone ?? "UTC").hour;
  return (
    <SettingsPage title="Appearance">
      <Glass
        radius={radii.xl}
        tint={p.side ?? "garnet"}
        contentStyle={[styles.preview, { gap: spacing.sm }]}
      >
        <GarnetMark size={64} />
        <AppText variant="title" serif>
          {greetingLine(settings.settings, settings.partner.name, hour)}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Live preview of Home
        </AppText>
      </Glass>
      <SettingsSection title="Light and dark">
        <View style={{ padding: spacing.md }}>
          <Segmented
            label="Appearance"
            options={[
              { label: "System", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
            ]}
            value={p.appearance}
            onChange={(appearance) => {
              set({ appearance });
            }}
          />
        </View>
      </SettingsSection>
      <SettingsSection
        title="Colour"
        footer="Rich washes your own pages in your gem's colour. Shared pages stay Garnet."
      >
        <View style={{ padding: spacing.md }}>
          <Segmented
            label="Colour richness"
            options={[
              { label: "Subtle", value: "subtle" },
              { label: "Rich", value: "rich" },
            ]}
            value={p.accent}
            onChange={(accent) => {
              set({ accent });
            }}
          />
        </View>
      </SettingsSection>
      <SettingsSection footer="Your side was chosen together in setup, and the two never match (P-51).">
        <SettingsRow
          icon="gem"
          tint={p.side === "sapphire" ? palette.sapphire500 : palette.ruby500}
          label="Your side"
          value={p.side === "sapphire" ? "Sapphire" : p.side === "ruby" ? "Ruby" : "Not chosen"}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

/** SET-04 · Nicknames and greetings, with the Home greeting and a notification previewed. */
export function NicknamesPage() {
  const { spacing, radii } = useTheme();
  const { data, set } = useEditable();
  const [nick, setNick] = useState<string | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  if (data === undefined) return <Loading title="Nicknames & greetings" />;
  const s = data.settings;
  const shown = {
    ...s,
    partnerNickname: nick ?? s.partnerNickname,
    customGreeting: custom ?? s.customGreeting,
  };
  const hour = Temporal.Now.zonedDateTimeISO(data.me.zone).hour;
  const thought = NOTIFICATION_CATALOGUE.find((n) => n.id === "thought");
  return (
    <SettingsPage
      title="Nicknames & greetings"
      intro="Only you see these. They never change what your partner sees."
    >
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label={`What you call ${data.partner.name}`}
          icon="heart"
          value={shown.partnerNickname}
          placeholder={data.partner.name}
          maxLength={24}
          onChangeText={setNick}
          onBlur={() => {
            if (nick !== null) set({ partnerNickname: nick.trim() });
          }}
        />
        <Segmented
          label="Greeting"
          options={[
            { label: "By time of day", value: "time" },
            { label: "My own words", value: "custom" },
          ]}
          value={s.greeting}
          onChange={(greeting) => {
            set({ greeting });
          }}
        />
        {s.greeting === "custom" ? (
          <TextField
            label="Your greeting"
            value={shown.customGreeting}
            placeholder="Hey {name} ✨"
            helper="Use {name} for their name."
            maxLength={40}
            onChangeText={setCustom}
            onBlur={() => {
              if (custom !== null) set({ customGreeting: custom });
            }}
          />
        ) : null}
      </Glass>
      <AppText variant="footnote" weight="600" color="textSecondary">
        Preview
      </AppText>
      <Glass radius={radii.xl} tint="garnet" contentStyle={[styles.preview, { gap: spacing.xs }]}>
        <AppText variant="title" serif>
          {greetingLine(shown, data.partner.name, hour)}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          On Home
        </AppText>
      </Glass>
      {thought === undefined ? null : (
        <NotificationMock
          frame="ios-banner"
          {...renderNotification(thought, "full", {
            sender: shown.partnerNickname.trim() || data.partner.name,
          })}
        />
      )}
    </SettingsPage>
  );
}

/** SET-05 · Notification preferences, one group at a time, each with a preview. */
export function NotificationsPage() {
  const { spacing, radii } = useTheme();
  const { data, set } = useEditable();
  const setup = useSetupState().data;
  const [preview, setPreview] = useState<NotifyGroup | null>(null);
  if (data === undefined) return <Loading title="Notifications" />;
  const s = data.settings;
  const denied =
    setup?.profile.notifications.status === "denied" ||
    setup?.profile.notifications.status === "off";
  return (
    <SettingsPage
      title="Notifications"
      intro="Now: right away. Quiet: arrives silently. Later: gathered into one gentle summary."
    >
      {denied ? (
        <Notice
          tone="info"
          icon="bell"
          text="Notifications are off for Garnet on this phone. You can turn them on in your phone's settings anytime."
        />
      ) : null}
      {NOTIFY_GROUPS.map((g) => {
        const sample = NOTIFICATION_CATALOGUE.find((n) => n.group === g.id);
        const mode = s.notify[g.id];
        return (
          <Glass
            key={g.id}
            radius={radii.xl}
            contentStyle={{ padding: spacing.lg, gap: spacing.md }}
          >
            <View style={[styles.row, { gap: spacing.sm }]}>
              <View style={styles.flex}>
                <AppText variant="headline">{g.title}</AppText>
                <AppText variant="footnote" color="textSecondary">
                  {g.detail}
                </AppText>
              </View>
              <Pressable
                onPress={() => {
                  setPreview((p) => (p === g.id ? null : g.id));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${g.title}`}
                hitSlop={8}
              >
                <AppText variant="footnote" weight="600" color="accent">
                  {preview === g.id ? "Hide" : "Preview"}
                </AppText>
              </Pressable>
            </View>
            <Segmented
              label={`${g.title} mode`}
              options={NOTIFY_MODES}
              value={mode}
              onChange={(m) => {
                set({ notify: { ...s.notify, [g.id]: m } });
              }}
            />
            {preview === g.id && sample !== undefined ? (
              mode === "off" ? (
                <AppText variant="footnote" color="textSecondary">
                  Off: nothing arrives for {g.title.toLowerCase()}.
                </AppText>
              ) : (
                <NotificationMock
                  frame={mode === "immediate" ? "ios-banner" : "ios-lock"}
                  time={mode === "scheduled" ? "summary" : "now"}
                  {...renderNotification(sample, s.previews, { sender: data.partner.name })}
                />
              )
            ) : null}
          </Glass>
        );
      })}
      <SettingsSection title="How they arrive">
        <SettingsRow
          icon="volume"
          tint={palette.ruby400}
          label="Sound"
          right={
            <Toggle
              value={s.sound}
              onValueChange={(sound) => {
                set({ sound });
              }}
              accessibilityLabel="Sound"
            />
          }
        />
        <SettingsRow
          icon="devices"
          tint={palette.violet500}
          label="Vibration"
          right={
            <Toggle
              value={s.vibration}
              onValueChange={(vibration) => {
                set({ vibration });
              }}
              accessibilityLabel="Vibration"
            />
          }
        />
        <SettingsRow
          icon="bell"
          tint={palette.sapphire500}
          label="Badge on the app icon"
          right={
            <Toggle
              value={s.badge}
              onValueChange={(badge) => {
                set({ badge });
              }}
              accessibilityLabel="Badge on the app icon"
            />
          }
        />
      </SettingsSection>
    </SettingsPage>
  );
}

const STARTS = ["20:00", "21:00", "22:00", "23:00", "00:00"] as const;
const ENDS = ["05:00", "06:00", "07:00", "08:00", "09:00"] as const;

/** "22:00" in one zone → the same moment's "HH:MM" in another, today. */
function sameMoment(hhmm: string, from: string, to: string): string {
  const [h = "0", m = "0"] = hhmm.split(":");
  const at = Temporal.Now.plainDateISO(from)
    .toZonedDateTime({ timeZone: from, plainTime: { hour: Number(h), minute: Number(m) } })
    .toInstant();
  return localTimeLabel(at, to);
}

/** SET-06 · Quiet hours. The window is the person's own choice; 22:00–07:00 is only suggested (U-21). */
export function QuietHoursPage() {
  const { spacing, radii } = useTheme();
  const { data, set } = useEditable();
  if (data === undefined) return <Loading title="Quiet hours" />;
  const q = data.settings.quiet;
  const chosen = q.start !== null && q.end !== null;
  // Completing the window turns quiet hours on; changing a set window keeps the switch as is.
  const pickWindow = (part: { start?: string; end?: string }) => {
    const next = { ...q, ...part };
    const complete = next.start !== null && next.end !== null;
    set({ quiet: { ...next, on: complete && (chosen ? q.on : true) } });
  };
  return (
    <SettingsPage
      title="Quiet hours"
      intro="Notifications wait quietly until morning, in your own time."
    >
      <SettingsSection
        footer={chosen ? undefined : "Choose a window below to turn quiet hours on."}
      >
        <SettingsRow
          icon="moon"
          tint={palette.violet600}
          label="Quiet hours"
          {...(chosen ? { detail: `${q.start ?? ""}–${q.end ?? ""} for you` } : {})}
          right={
            <Toggle
              value={q.on && chosen}
              onValueChange={(on) => {
                if (chosen) set({ quiet: { ...q, on } });
              }}
              accessibilityLabel="Quiet hours"
            />
          }
        />
      </SettingsSection>
      {!chosen ? (
        <Glass
          radius={radii.xl}
          tint="garnet"
          contentStyle={{ padding: spacing.lg, gap: spacing.sm }}
        >
          <View style={[styles.row, { gap: spacing.xs }]}>
            <AppText variant="headline" style={styles.flex}>
              22:00 – 07:00
            </AppText>
            <View style={styles.badgeSoft}>
              <AppText variant="caption" weight="600" color="accent">
                Suggested
              </AppText>
            </View>
          </View>
          <AppText variant="footnote" color="textSecondary">
            A suggestion only; the default window hasn't been decided (U-21).
          </AppText>
          <Button
            label="Use the suggested hours"
            variant="secondary"
            onPress={() => {
              set({ quiet: { on: true, ...SUGGESTED_QUIET_HOURS } });
            }}
          />
        </Glass>
      ) : null}
      <AppText variant="footnote" weight="600" color="textSecondary">
        Starts
      </AppText>
      <ScrollView
        horizontal
        style={styles.noGrow}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {STARTS.map((t) => (
          <GlassChip
            key={t}
            label={t}
            selected={q.start === t}
            onPress={() => {
              pickWindow({ start: t });
            }}
          />
        ))}
      </ScrollView>
      <AppText variant="footnote" weight="600" color="textSecondary">
        Ends
      </AppText>
      <ScrollView
        horizontal
        style={styles.noGrow}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {ENDS.map((t) => (
          <GlassChip
            key={t}
            label={t}
            selected={q.end === t}
            onPress={() => {
              pickWindow({ end: t });
            }}
          />
        ))}
      </ScrollView>
      {chosen ? (
        <AppText variant="footnote" color="textSecondary">
          {`That's ${sameMoment(q.start ?? "22:00", data.me.zone, data.partner.zone)}–${sameMoment(q.end ?? "07:00", data.me.zone, data.partner.zone)} for ${data.partner.name} in ${cityForZone(data.partner.zone)}.`}
        </AppText>
      ) : null}
      <Notice
        tone="info"
        icon="info"
        text="Garnet isn't an emergency service, so quiet hours are never bypassed."
      />
    </SettingsPage>
  );
}

const PREVIEW_CHOICES: readonly {
  mode: PreviewMode;
  title: string;
  detail: string;
  badge?: string;
}[] = [
  {
    mode: "generic",
    title: "Generic",
    detail: "The same gentle line for everything.",
    badge: "Recommended",
  },
  {
    mode: "sender",
    title: "Sender and category",
    detail: "Who it's from and what kind, nothing more.",
  },
  { mode: "full", title: "Full content", detail: "The words themselves, as your settings allow." },
];

/** SET-07 · Lock-screen previews, each choice shown on a lock screen. */
export function PreviewsPage() {
  const { data, set } = useEditable();
  if (data === undefined) return <Loading title="Lock-screen previews" />;
  const msg = NOTIFICATION_CATALOGUE.find((n) => n.id === "chat-message");
  return (
    <SettingsPage
      title="Lock-screen previews"
      intro="Anyone who can see your phone can see previews."
    >
      {PREVIEW_CHOICES.map((c) => (
        <Choice
          key={c.mode}
          title={c.title}
          detail={c.detail}
          selected={data.settings.previews === c.mode}
          {...(c.badge === undefined ? {} : { badge: c.badge })}
          onPress={() => {
            set({ previews: c.mode });
          }}
        >
          {msg === undefined ? null : (
            <NotificationMock
              frame="ios-lock"
              {...renderNotification(msg, c.mode, {
                sender: data.partner.name,
                messagePreview: "Thinking of you, call tonight?",
              })}
            />
          )}
        </Choice>
      ))}
    </SettingsPage>
  );
}

const REMINDER_CHOICES: readonly { level: ReminderLevel; title: string; detail: string }[] = [
  { level: "off", title: "Off", detail: "No reminders at all." },
  {
    level: "gentle",
    title: "Gentle",
    detail: 'At most one a week: "Save this moment if you\'d like."',
  },
  {
    level: "custom",
    title: "Custom",
    detail: "Only the reminders you choose for events, never more than one a day.",
  },
];

/** SET-08 · Reminders: no repeated nudges, no guilt. Not chosen sends none (P-65). */
export function RemindersPage() {
  const { data, set } = useEditable();
  if (data === undefined) return <Loading title="Reminders" />;
  return (
    <SettingsPage
      title="Reminders"
      intro="Never repeated, never guilt. You can change this anytime."
    >
      {data.settings.reminders === null ? (
        <Notice tone="info" icon="clock" text="Not chosen yet, so no reminders are sent." />
      ) : null}
      {REMINDER_CHOICES.map((c) => (
        <Choice
          key={c.level}
          title={c.title}
          detail={c.detail}
          selected={data.settings.reminders === c.level}
          onPress={() => {
            set({ reminders: c.level });
          }}
        />
      ))}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // A sideways row must not stretch to fill the column (react-native-web).
  noGrow: { flexGrow: 0 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  preview: { alignItems: "center", padding: 20 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeSoft: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
