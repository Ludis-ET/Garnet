/**
 * CHAT-09 · Conversation details: the two of you, pinned messages, shared media, and each
 * person's own settings. "Seen" works only when both turn it on (P-58, U-35 open); typing is
 * shared unless turned off; message alerts are simulated. A shared page, so Garnet violet.
 */
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { messagePreview } from "@/domain/chat";
import { formatDuration } from "@/domain/days";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { gemOf } from "./components/Presence";
import {
  useChatSettings,
  usePinnedMessages,
  useSharedMedia,
  useUpdateChatSettings,
} from "./useChat";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

function SettingRow({
  icon,
  label,
  note,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  note: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md, paddingVertical: spacing.sm }]}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <View style={styles.flex}>
        <AppText variant="callout" weight="500">
          {label}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {note}
        </AppText>
      </View>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

function Details() {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const now = useNow();
  const home = useHomeToday();
  const settings = useChatSettings();
  const update = useUpdateChatSettings();
  const pinned = usePinnedMessages();
  const media = useSharedMedia();
  const { openMedia } = useMediaPlayer();
  const me = home.data?.me;
  const partner = home.data?.partner;
  const s = settings.data;
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  const set = (patch: Parameters<typeof update.mutate>[0]) => {
    update.mutate(patch, {
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  if (me === undefined || partner === undefined || s === undefined)
    return (
      <GlassScreen
        onBack={() => {
          goBack("/us/chat");
        }}
      >
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );

  return (
    <GlassScreen
      tabBar
      onBack={() => {
        goBack("/us/chat");
      }}
    >
      <Animated.View {...enter()} style={[styles.center, { gap: spacing.sm }]}>
        <View style={[styles.row, styles.duo]}>
          <CharacterSlot
            character={gemOf(partner.side)}
            look={{ mood: "loving", occasion: "together" }}
            size={120}
            aspectRatio={FRAME_ASPECT}
          />
          <ProfileAvatar
            name={partner.name}
            avatar={partner.avatar ?? { kind: "initials", swatch: 1 }}
            side={partner.side}
            size={84}
          />
          <CharacterSlot
            character={gemOf(me.side)}
            look={{ mood: "loving", occasion: "together" }}
            size={112}
            aspectRatio={FRAME_ASPECT}
          />
        </View>
        <AppText variant="title" serif>
          {partner.name}
        </AppText>
        <AppText variant="footnote" color="textSecondary">
          {localTimeLabel(now, partner.zone)} in {cityForZone(partner.zone)}
        </AppText>
      </Animated.View>

      {pinned.data === undefined || pinned.data.length === 0 ? null : (
        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="headline">Pinned</AppText>
          {pinned.data.map((m) => (
            <Glass
              key={m.id}
              radius={radii.lg}
              shadow={false}
              contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
            >
              <Icon name="pin" size={16} color={colors.accent} />
              <AppText variant="callout" numberOfLines={2} style={styles.flex}>
                {messagePreview(m)}
              </AppText>
            </Glass>
          ))}
        </Animated.View>
      )}

      <Animated.View {...enter()} style={{ gap: spacing.sm }}>
        <AppText variant="headline">Shared</AppText>
        {media.data === undefined || media.data.length === 0 ? (
          <AppText variant="callout" color="textSecondary">
            Photos, videos and voice notes you send will gather here.
          </AppText>
        ) : (
          <View style={[styles.grid, { gap: spacing.sm }]}>
            {media.data.map((m) => {
              const item = m.media;
              if (item === undefined) return null;
              return (
                <Pressable
                  key={m.id}
                  style={styles.cell}
                  onPress={() => {
                    if (item.type === "voice") return;
                    openMedia({
                      type: item.type,
                      art: item.art,
                      caption: item.caption,
                      ...(item.type === "video" ? { seconds: item.seconds } : {}),
                    });
                  }}
                  accessibilityRole={item.type === "voice" ? "text" : "imagebutton"}
                  accessibilityLabel={
                    item.type === "voice"
                      ? `Voice note, ${formatDuration(item.seconds)}`
                      : `Open ${item.type}`
                  }
                >
                  {item.type === "voice" ? (
                    <Glass radius={radii.md} shadow={false} contentStyle={styles.voiceCell}>
                      <AppText variant="title">🎙️</AppText>
                      <AppText variant="caption" color="textSecondary">
                        {formatDuration(item.seconds)}
                      </AppText>
                    </Glass>
                  ) : (
                    <MediaArt
                      art={item.art}
                      {...(item.type === "video" ? { seconds: item.seconds } : {})}
                      height={104}
                      radius={radii.md}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Animated.View>

      <Animated.View {...enter()} style={{ gap: spacing.sm }}>
        <AppText variant="headline">Just for you</AppText>
        <Glass
          radius={radii.xl}
          contentStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
        >
          <SettingRow
            icon="eye"
            label='Show "Seen"'
            note={
              s.readReceipts === null
                ? `Not chosen yet. Shows only if you and ${partner.name} both turn it on.`
                : `Shows only when you and ${partner.name} both have it on.`
            }
            value={s.readReceipts === true}
            onChange={(v) => {
              set({ readReceipts: v });
            }}
          />
          <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
          <SettingRow
            icon="chat"
            label="Show when I'm typing"
            note={`${partner.name} sees typing dots while you write.`}
            value={s.typingIndicators}
            onChange={(v) => {
              set({ typingIndicators: v });
            }}
          />
          <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
          <SettingRow
            icon="heart"
            label="Message alerts"
            note="A notification for each new message."
            value={s.notifications}
            onChange={(v) => {
              set({ notifications: v });
            }}
          />
        </Glass>
      </Animated.View>

      <View style={[styles.row, styles.centerRow, { gap: spacing.xs }]}>
        <Icon name="lock" size={13} color={colors.textTertiary} />
        <AppText variant="footnote" color="textTertiary">
          Only the two of you can see this conversation.
        </AppText>
      </View>
    </GlassScreen>
  );
}

export function ConversationDetailsScreen() {
  return (
    <SideScope side="garnet">
      <View style={styles.fill}>
        <Details />
      </View>
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Inside GlassScreen's scroll content: grow, never `flex: 1` (rule 11).
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  centerRow: { justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  duo: { alignItems: "flex-end" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "31.5%" },
  voiceCell: { height: 104, alignItems: "center", justifyContent: "center", gap: 4 },
  hairline: { height: StyleSheet.hairlineWidth },
});
