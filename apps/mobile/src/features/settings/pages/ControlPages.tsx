import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { flightHint, formatKm } from "@/domain/distance";
import { NOTIFY_MODES, HOME_CARDS, type UserSettings } from "@/domain/settings";
import { serviceErrorMessage } from "@/features/auth/authUi";
import {
  useChatSettings,
  useChatSummary,
  useMarkChatRead,
  useUpdateChatSettings,
} from "@/features/chat/useChat";
import { readCoarseLocation, useAutoLocation } from "@/features/location/deviceLocation";
import { useSaveLocation, useUsOverview } from "@/features/us/useUs";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsRow, SettingsSection } from "../components/SettingsList";
import { useSettings, useUpdateSettings } from "../useSettings";

function useEditable() {
  const toast = useToast();
  const data = useSettings().data;
  const update = useUpdateSettings();
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const set = (patch: Partial<UserSettings>) => {
    update.mutate(patch, { onError });
  };
  return { data, set, onError, toast };
}

function Loading({ title }: { title: string }) {
  return (
    <SettingsPage title={title}>
      <ActivityIndicator accessibilityLabel="Loading" />
    </SettingsPage>
  );
}

function SwitchRow({
  label,
  detail,
  value,
  onChange,
  icon,
  tint,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: Parameters<typeof SettingsRow>[0]["icon"];
  tint: string;
}) {
  return (
    <SettingsRow
      {...(icon === undefined ? {} : { icon })}
      tint={tint}
      label={label}
      detail={detail}
      right={<Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />}
    />
  );
}

/** Home layout (P-66): the ring of shortcuts, the characters below, and each card. */
export function HomeLayoutPage() {
  const { data, set } = useEditable();
  if (data === undefined) return <Loading title="Home layout" />;
  const h = data.settings.home;
  return (
    <SettingsPage title="Home layout" intro="Choose what Home shows. Only you see these choices.">
      <SettingsSection title="Around Garnet">
        <SwitchRow
          icon="home"
          tint={palette.violet600}
          label="Shortcut ring"
          detail="Beads that drift around Garnet"
          value={h.ring}
          onChange={(ring) => {
            set({ home: { ...h, ring } });
          }}
        />
        <SwitchRow
          icon="heart"
          tint={palette.ruby500}
          label="Characters below"
          detail="Your gems peeking over the tab bar"
          value={h.watchers}
          onChange={(watchers) => {
            set({ home: { ...h, watchers } });
          }}
        />
      </SettingsSection>
      <SettingsSection title="Cards" footer="Hidden cards come back when you turn them on.">
        {HOME_CARDS.map((c) => (
          <SwitchRow
            key={c.id}
            icon="sparkle"
            tint={palette.violet400}
            label={c.label}
            detail={c.detail}
            value={h.cards[c.id]}
            onChange={(on) => {
              set({ home: { ...h, cards: { ...h.cards, [c.id]: on } } });
            }}
          />
        ))}
      </SettingsSection>
    </SettingsPage>
  );
}

/** Chat (P-58, P-66): Seen, typing, how messages notify, and clearing the unread count. */
export function ChatSettingsPage() {
  const { data, set, onError, toast } = useEditable();
  const chat = useChatSettings().data;
  const updateChat = useUpdateChatSettings();
  const summary = useChatSummary().data;
  const markRead = useMarkChatRead();
  const { spacing } = useTheme();
  if (data === undefined) return <Loading title="Chat" />;
  const unread = summary?.unreadCount ?? 0;
  return (
    <SettingsPage title="Chat">
      <SettingsSection
        title="Between you"
        footer={`"Seen" shows only when you both turn it on. Either of you can turn it off.`}
      >
        <SwitchRow
          icon="eye"
          tint={palette.violet500}
          label='Show "Seen"'
          {...(chat?.readReceipts === null ? { detail: "Not chosen yet" } : {})}
          value={chat?.readReceipts === true}
          onChange={(readReceipts) => {
            updateChat.mutate({ readReceipts }, { onError });
          }}
        />
        <SwitchRow
          icon="chat"
          tint={palette.sapphire500}
          label="Show when I'm typing"
          value={chat?.typingIndicators ?? true}
          onChange={(typingIndicators) => {
            updateChat.mutate({ typingIndicators }, { onError });
          }}
        />
      </SettingsSection>
      <SettingsSection title="Message notifications">
        <View style={{ padding: spacing.md }}>
          <Segmented
            label="Message notifications"
            options={NOTIFY_MODES}
            value={data.settings.notify.messages}
            onChange={(m) => {
              set({ notify: { ...data.settings.notify, messages: m } });
            }}
          />
        </View>
      </SettingsSection>
      <SettingsSection footer="Your unread count is yours alone; clearing it tells nobody anything.">
        <SettingsRow
          icon="check"
          tint={palette.success}
          label="Mark all as read"
          value={unread > 0 ? `${String(unread)} unread` : "All read"}
          {...(unread > 0
            ? {
                onPress: () => {
                  markRead.mutate(undefined, {
                    onSuccess: () => {
                      toast.show("All caught up.");
                    },
                  });
                },
              }
            : {})}
        />
      </SettingsSection>
    </SettingsPage>
  );
}

/** Location & distance (owner direction P-66): automatic, rounded, and the partner sees km only. */
export function LocationPage() {
  useAutoLocation();
  const { data, set, onError, toast } = useEditable();
  const overview = useUsOverview().data;
  const save = useSaveLocation();
  const [busy, setBusy] = useState(false);
  if (data === undefined) return <Loading title="Location & distance" />;
  const share = data.settings.location.share;
  const d = overview?.distance ?? null;
  return (
    <SettingsPage
      title="Location & distance"
      intro={`Garnet works out how far you are from ${data.partner.name}, so you never have to type a place.`}
    >
      <SettingsSection>
        <SwitchRow
          icon="plane"
          tint={palette.sapphire500}
          label="Show how far apart"
          detail="Uses this phone's location while Garnet is open"
          value={share}
          onChange={(on) => {
            set({ location: { share: on } });
          }}
        />
      </SettingsSection>
      {share ? (
        <SettingsSection title="Right now">
          <SettingsRow
            icon="globe"
            tint={palette.violet500}
            label={
              d === null
                ? "Not available yet"
                : `${d.approximate ? "About " : ""}${formatKm(d.km)} km`
            }
            {...(d === null
              ? {}
              : {
                  detail: d.approximate
                    ? `From your time zones (${flightHint(d.km)})`
                    : `From your phones (${flightHint(d.km)})`,
                })}
          />
          <SettingsRow
            icon="refresh"
            tint={palette.sapphire400}
            label={busy ? "Updating…" : "Update now"}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void readCoarseLocation().then((r) => {
                setBusy(false);
                if (r.kind === "ok") save.mutate(r.point, { onError });
                else
                  toast.show(
                    r.kind === "denied"
                      ? "Location is off for Garnet. Using your time zone instead."
                      : "No location on this device. Using your time zone instead.",
                  );
              });
            }}
          />
        </SettingsSection>
      ) : null}
      <Notice
        tone="info"
        icon="lock"
        text={`${data.partner.name} sees only the kilometres, never where you are. Garnet keeps your position rounded to about 10 km, never in the background, and forgets it when you turn this off.`}
      />
      {share ? null : (
        <Button
          label="Turn distance back on"
          variant="secondary"
          onPress={() => {
            set({ location: { share: true } });
          }}
        />
      )}
    </SettingsPage>
  );
}

/** Motion & haptics (P-66): calm the app's motion, and turn vibration off. */
export function MotionPage() {
  const { data, set } = useEditable();
  const { spacing, reduceMotion } = useTheme();
  if (data === undefined) return <Loading title="Motion & haptics" />;
  return (
    <SettingsPage title="Motion & haptics">
      <SettingsSection
        title="Motion"
        footer="Calm stops drifting, springs and sparkles in Garnet, even if your phone allows them."
      >
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Segmented
            label="Motion"
            options={[
              { label: "Like my phone", value: "system" },
              { label: "Calm", value: "reduce" },
            ]}
            value={data.settings.motion}
            onChange={(motion) => {
              set({ motion });
            }}
          />
          <AppText variant="caption" color="textSecondary">
            {reduceMotion ? "Motion is calm right now." : "Motion is full right now."}
          </AppText>
        </View>
      </SettingsSection>
      <SettingsSection>
        <SwitchRow
          icon="devices"
          tint={palette.violet500}
          label="Haptics"
          detail="Little taps when you send, hold or choose"
          value={data.settings.haptics}
          onChange={(haptics) => {
            set({ haptics });
          }}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
