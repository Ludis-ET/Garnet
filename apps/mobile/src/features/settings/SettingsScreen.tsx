import { router, type Href } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { CountBadge } from "@/components/ui/CountBadge";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { noOutline } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useDemoControls } from "@/data/RepositoryProvider";
import { cityForZone } from "@/domain/identity";
import type { UserSettings } from "@/domain/settings";
import { SUGGESTED_QUIET_HOURS } from "@/domain/settings";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useUnreadCount } from "@/features/notifications/useInbox";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "./components/SettingsList";
import { useSettings, useUpdateSettings } from "./useSettings";
import { ENTER, LAYOUT } from "@/theme/transitions";
import { useTestingTools } from "@/features/prototype/devTools";

const PREVIEW_LABEL = { generic: "Generic", sender: "Sender only", full: "Full" } as const;
const REMINDER_LABEL = { off: "Off", gentle: "Gentle", custom: "Custom" } as const;

interface Row {
  page: string;
  label: string;
  icon: IconName;
  tint: string;
  value?: string;
  badge?: number;
  /** Extra words that find it in search. */
  words?: string;
  destructive?: boolean;
}

/** A Control-Center-style glass toggle: an icon in a disc, its name and its state in words. */
function QuickToggle({
  icon,
  label,
  on,
  onPress,
}: {
  icon: IconName;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const { colors, radii, reduceMotion } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      style={({ pressed }) => [styles.quick, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
    >
      <Glass
        radius={radii.xl}
        tint={on ? "garnet" : "none"}
        shadow={on}
        contentStyle={styles.quickInner}
      >
        <Animated.View
          key={String(on)}
          {...(reduceMotion ? {} : { entering: ENTER })}
          style={[styles.quickDisc, { backgroundColor: on ? colors.accent : colors.glassVeilSoft }]}
        >
          <Icon name={icon} size={18} color={on ? colors.onAccent : colors.textSecondary} />
        </Animated.View>
        <AppText variant="footnote" weight="600" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="caption" color={on ? "accent" : "textTertiary"}>
          {on ? "On" : "Off"}
        </AppText>
      </Glass>
    </Pressable>
  );
}

/**
 * SET-01 · Settings that control everything (P-63, P-66): you at the top, quick glass toggles
 * for what people change most, a search across every setting, then iOS inset groups that open
 * each page. Everything here is this person's own (§5). Ending the space and deleting the
 * account sit apart at the bottom, separate from each other (prompt 15).
 */
export function SettingsScreen() {
  const { colors, radii, spacing, typography, reduceMotion } = useTheme();
  const toast = useToast();
  const demo = useDemoControls();
  const tools = useTestingTools();
  const data = useSettings().data;
  const update = useUpdateSettings();
  const inboxUnread = useUnreadCount();
  const [reset, setReset] = useState(false);
  const [query, setQuery] = useState("");
  const go = (page: string) => () => {
    router.push(`/settings/${page}` as Href);
  };
  const set = (patch: Partial<UserSettings>) => {
    update.mutate(patch, {
      onError: (e: unknown) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  if (data === undefined)
    return (
      <SettingsPage title="Settings" back="/home">
        <ActivityIndicator accessibilityLabel="Loading" />
      </SettingsPage>
    );
  const { me, partner, settings } = data;
  const sideName = me.side === "ruby" ? "Ruby" : me.side === "sapphire" ? "Sapphire" : "Garnet";
  const quietOn = settings.quiet.on && settings.quiet.start !== null;

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Account",
      rows: [
        {
          page: "profile",
          label: "Profile",
          icon: "user",
          tint: palette.ruby700,
          words: "name nickname email birthday home town city terms",
        },
        {
          page: "devices",
          label: "Devices & password",
          icon: "key",
          tint: palette.violet500,
          words: "sign out sessions security",
        },
        {
          page: "sign-in-methods",
          label: "Sign-in methods",
          icon: "shield",
          tint: palette.sapphire500,
          words: "google apple connect password account",
        },
      ],
    },
    {
      title: "Home & look",
      rows: [
        {
          page: "home",
          label: "Home layout",
          icon: "home",
          tint: palette.violet600,
          words: "cards shortcuts ring characters ruby sapphire",
        },
        {
          page: "home-widgets",
          label: "Widgets",
          icon: "sparkle",
          tint: palette.ruby400,
          words: "widget home screen add",
        },
        {
          page: "appearance",
          label: "Appearance",
          icon: "palette",
          tint: palette.ruby400,
          words: "dark light theme colour",
        },
        {
          page: "nicknames",
          label: "Nicknames & greetings",
          icon: "heart",
          tint: palette.ruby500,
          value: settings.partnerNickname.trim() || partner.name,
        },
        {
          page: "motion",
          label: "Motion & haptics",
          icon: "sparkle",
          tint: palette.violet400,
          value: settings.motion === "reduce" ? "Calm" : "Phone",
          words: "animation vibration reduce",
        },
      ],
    },
    {
      title: "Notifications",
      rows: [
        {
          page: "../notifications",
          label: "Notification centre",
          icon: "bell",
          tint: palette.ruby500,
          badge: inboxUnread,
          words: "inbox unread",
        },
        {
          page: "notifications",
          label: "Notifications",
          icon: "bell",
          tint: palette.ruby400,
          words: "sound badge alerts",
        },
        {
          page: "quiet-hours",
          label: "Quiet hours",
          icon: "moon",
          tint: palette.violet600,
          value: quietOn ? `${settings.quiet.start ?? ""}–${settings.quiet.end ?? ""}` : "Off",
          words: "night sleep",
        },
        {
          page: "previews",
          label: "Lock-screen previews",
          icon: "lock",
          tint: palette.sapphire500,
          value: PREVIEW_LABEL[settings.previews],
        },
        {
          page: "reminders",
          label: "Reminders",
          icon: "clock",
          tint: palette.sapphire400,
          value: settings.reminders === null ? "Not chosen" : REMINDER_LABEL[settings.reminders],
        },
      ],
    },
    {
      title: "Together",
      rows: [
        {
          page: "chat",
          label: "Chat",
          icon: "chat",
          tint: palette.sapphire500,
          words: "seen typing messages read",
        },
        {
          page: "location",
          label: "Location & distance",
          icon: "plane",
          tint: palette.sapphire400,
          value: settings.location.share ? "On" : "Off",
          words: "km kilometres how far gps",
        },
        {
          page: "privacy",
          label: `What ${partner.name} can see`,
          icon: "shield",
          tint: colors.success,
          words: "privacy",
        },
        {
          page: "time",
          label: "Time zone & day",
          icon: "globe",
          tint: palette.sapphire500,
          words: "clock boundary",
        },
      ],
    },
    {
      title: "Data & help",
      rows: [
        { page: "offline", label: "Offline & sync", icon: "refresh", tint: palette.violet400 },
        { page: "export", label: "Export my data", icon: "download", tint: palette.violet600 },
        {
          page: "about",
          label: "About & feedback",
          icon: "help",
          tint: palette.sapphire400,
          words: "licences version",
        },
      ],
    },
    {
      title: "Testing",
      rows: [
        {
          page: "notification-lab",
          label: "Notification preview lab",
          icon: "bell",
          tint: palette.violet500,
        },
        { page: "email-lab", label: "Email preview lab", icon: "mail", tint: palette.violet500 },
        {
          page: "widgets",
          label: "Widget designs",
          icon: "home",
          tint: palette.violet400,
          words: "widget home screen",
        },
        {
          page: "states",
          label: "Overlays & states",
          icon: "sparkle",
          tint: palette.violet600,
          words: "toasts errors loading empty",
        },
      ],
    },
    {
      title: "Leaving",
      rows: [
        {
          page: "end-space",
          label: "End our space",
          icon: "x",
          tint: colors.danger,
          destructive: true,
        },
        {
          page: "delete-account",
          label: "Delete my account",
          icon: "trash",
          tint: colors.danger,
          destructive: true,
        },
      ],
    },
  ];
  const open = (page: string) =>
    page.startsWith("../")
      ? () => {
          router.push("/notifications");
        }
      : go(page);
  const row = (r: Row) => (
    <SettingsRow
      key={`${r.page}-${r.label}`}
      icon={r.icon}
      tint={r.tint}
      label={r.label}
      {...(r.value === undefined ? {} : { value: r.value })}
      {...(r.destructive === true ? { destructive: true } : {})}
      onPress={open(r.page)}
      {...(r.badge === undefined || r.badge === 0
        ? {}
        : { right: <CountBadgeRow count={r.badge} onPress={open(r.page)} label={r.label} /> })}
    />
  );
  const q = query.trim().toLowerCase();
  // Testing tools stay out of sight until unlocked in About (P-75).
  const shown = tools ? sections : sections.filter((s) => s.title !== "Testing");
  const found = shown
    .flatMap((s) => s.rows.map((r) => ({ ...r, section: s.title })))
    .filter((r) => `${r.label} ${r.section} ${r.words ?? ""}`.toLowerCase().includes(q));

  return (
    <SettingsPage title="Settings" back="/home">
      <Pressable
        onPress={go("profile")}
        accessibilityRole="button"
        accessibilityLabel={`${me.name}, ${sideName}. Profile`}
      >
        <Glass radius={radii.xl} tint={me.side ?? "garnet"} contentStyle={styles.me}>
          <ProfileAvatar
            name={me.name}
            avatar={me.avatar ?? { kind: "initials", swatch: 0 }}
            side={me.side}
            size={60}
          />
          <View style={styles.flex}>
            <AppText variant="title">{me.name}</AppText>
            <AppText variant="footnote" color="textSecondary">
              {sideName} · {cityForZone(me.zone)}
            </AppText>
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {data.email}
            </AppText>
          </View>
          <Icon name="chevron-right" size={16} color={colors.textTertiary} />
        </Glass>
      </Pressable>

      {/* The things people change most, one tap each. */}
      <View accessibilityLabel="Quick controls" style={[styles.grid, { gap: spacing.sm }]}>
        <QuickToggle
          icon="plane"
          label="Distance"
          on={settings.location.share}
          onPress={() => {
            set({ location: { share: !settings.location.share } });
          }}
        />
        <QuickToggle
          icon="heart"
          label="Characters"
          on={settings.home.watchers}
          onPress={() => {
            set({ home: { ...settings.home, watchers: !settings.home.watchers } });
          }}
        />
        <QuickToggle
          icon="moon"
          label="Quiet hours"
          on={quietOn}
          onPress={() => {
            set({
              quiet: quietOn
                ? { ...settings.quiet, on: false }
                : settings.quiet.start === null || settings.quiet.end === null
                  ? { on: true, ...SUGGESTED_QUIET_HOURS }
                  : { ...settings.quiet, on: true },
            });
          }}
        />
        <QuickToggle
          icon="devices"
          label="Haptics"
          on={settings.haptics}
          onPress={() => {
            set({ haptics: !settings.haptics });
          }}
        />
        <QuickToggle
          icon="sparkle"
          label="Calm motion"
          on={settings.motion === "reduce"}
          onPress={() => {
            set({ motion: settings.motion === "reduce" ? "system" : "reduce" });
          }}
        />
        <QuickToggle
          icon="home"
          label="Shortcut ring"
          on={settings.home.ring}
          onPress={() => {
            set({ home: { ...settings.home, ring: !settings.home.ring } });
          }}
        />
      </View>

      <Glass radius={radii.pill} shadow={false} contentStyle={[styles.search, { gap: spacing.xs }]}>
        <Icon name="search" size={17} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search settings"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Search settings"
          selectionColor={colors.accent}
          style={[
            styles.searchInput,
            noOutline,
            { color: colors.textPrimary, fontFamily: typography.families.text["400"] },
          ]}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Icon name="x" size={15} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </Glass>

      {q.length > 0 ? (
        <Animated.View
          {...(reduceMotion ? {} : { entering: ENTER })}
          accessibilityLiveRegion="polite"
        >
          {found.length === 0 ? (
            <AppText variant="callout" color="textSecondary">
              No setting matches "{query.trim()}".
            </AppText>
          ) : (
            <SettingsSection title="Results">{found.map(row)}</SettingsSection>
          )}
        </Animated.View>
      ) : (
        <Animated.View {...(reduceMotion ? {} : { layout: LAYOUT })} style={{ gap: spacing.xl }}>
          {shown.map((s) => (
            <SettingsSection
              key={s.title}
              title={s.title}
              {...(s.title === "Leaving"
                ? { footer: "These are separate. Ending the space doesn't delete your account." }
                : s.title === "Testing"
                  ? { footer: "Testing tools for this preview. Nothing leaves this phone." }
                  : {})}
            >
              {s.rows.map(row)}
              {s.title === "Testing" ? (
                <SettingsRow
                  icon="refresh"
                  tint={palette.violet400}
                  label="Reset sample data"
                  onPress={() => {
                    setReset(true);
                  }}
                />
              ) : null}
            </SettingsSection>
          ))}
        </Animated.View>
      )}
      <View style={{ height: spacing.xl }} />

      <ActionSheet
        visible={reset}
        title="Reset sample data?"
        body="This restores the sample data on this phone."
        icon="refresh"
        confirmLabel="Reset"
        onCancel={() => {
          setReset(false);
        }}
        onConfirm={() => {
          setReset(false);
          demo.reset();
          toast.show("Sample data restored.");
          router.replace("/");
        }}
      />
    </SettingsPage>
  );
}

/** A count and a chevron at the end of a row that opens something with news in it. */
function CountBadgeRow({
  count,
  onPress,
  label,
}: {
  count: number;
  onPress: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${String(count)} new`}
      hitSlop={10}
      style={styles.countRow}
    >
      <CountBadge count={count} />
      <Icon name="chevron-right" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  me: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  quick: { width: "31.6%" },
  quickInner: { padding: 12, gap: 4, alignItems: "flex-start" },
  quickDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  search: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0, height: 44 },
  countRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
