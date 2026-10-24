import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { formatDuration } from "@/domain/days";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ChatSearchModal } from "./components/ChatSearchModal";
import { PinnedSheet } from "./components/PinnedSheet";
import {
  useChatMessages,
  useChatSettings,
  useChatSummary,
  usePinnedMessages,
  useSharedMedia,
  useTogglePin,
  useUpdateChatSettings,
} from "./useChat";

type MediaFilter = "all" | "photo" | "video" | "voice";

function ConversationDetailsContent() {
  const { colors, spacing, radii, reduceMotion } = useTheme();
  const { openMedia, playVoice } = useMediaPlayer();

  const summaryQuery = useChatSummary();
  const messagesQuery = useChatMessages();
  const settingsQuery = useChatSettings();
  const sharedMediaQuery = useSharedMedia();
  const pinnedQuery = usePinnedMessages();
  const updateSettings = useUpdateChatSettings();
  const togglePin = useTogglePin();

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [pinnedSheetOpen, setPinnedSheetOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  if (summaryQuery.isLoading || settingsQuery.isLoading) {
    return (
      <GlassScreen>
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Loading conversation details" />
        </View>
      </GlassScreen>
    );
  }

  const summary = summaryQuery.data;
  const partner = summary?.partner ?? { name: "Noah", side: "sapphire", zone: "Europe/London" };
  const settings = settingsQuery.data ?? {
    notifications: true,
    readReceipts: false,
    typingIndicators: true,
  };
  const allMedia = sharedMediaQuery.data ?? [];
  const pinned = pinnedQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  const filteredMedia = allMedia.filter((m) => {
    if (!m.media) return false;
    if (mediaFilter === "all") return true;
    return m.media.type === mediaFilter;
  });

  const enter = (i: number) =>
    reduceMotion
      ? {}
      : {
          entering: FadeInDown.delay(i * 60)
            .springify()
            .damping(18),
        };

  return (
    <View style={styles.fill}>
      <GlassScreen>
        {/* Navigation bar */}
        <Animated.View {...enter(0)} style={[styles.navRow, { gap: spacing.sm }]}>
          <IconButton
            icon="chevron-left"
            label="Back to chat"
            onPress={() => {
              router.back();
            }}
          />
          <AppText variant="largeTitle" style={styles.titleText}>
            Details
          </AppText>
        </Animated.View>

        {/* Noah Profile Card */}
        <Animated.View {...enter(1)}>
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <ProfileAvatar
              avatar={{ kind: "initials", swatch: 1 }}
              name={partner.name}
              side={partner.side ?? "sapphire"}
              size={64}
            />
            <AppText variant="title" weight="600" style={{ marginTop: 8 }}>
              {partner.name}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              18:42 in London (Europe/London)
            </AppText>
          </View>
        </Animated.View>

        {/* Links: Pinned & Search */}
        <Animated.View {...enter(2)} style={[styles.linksGroup, { gap: spacing.sm }]}>
          <Pressable
            onPress={() => {
              setPinnedSheetOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Pinned messages, ${pinned.length} total`}
            style={({ pressed }) => [
              styles.linkRow,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.linkLeading}>
              <Icon name="pin" size={18} color={colors.accent} />
              <AppText variant="callout" weight="500">
                Pinned messages
              </AppText>
            </View>
            <View style={styles.linkTrailing}>
              {pinned.length > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: colors.accentSoft }]}>
                  <AppText variant="caption" weight="600" color="accent">
                    {pinned.length}
                  </AppText>
                </View>
              ) : null}
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setSearchModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Search conversation"
            style={({ pressed }) => [
              styles.linkRow,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.linkLeading}>
              <Icon name="search" size={18} color={colors.ruby} />
              <AppText variant="callout" weight="500">
                Search in conversation
              </AppText>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>

        {/* Settings Group (Notifications, Read Receipts [U-35], Typing) */}
        <Animated.View
          {...enter(3)}
          style={[
            styles.settingsCard,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <AppText variant="headline" weight="600" style={{ marginBottom: spacing.sm }}>
            Preferences
          </AppText>

          {/* Notifications Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingTextCol}>
              <AppText variant="callout" weight="500">
                Notifications
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Get notified when {partner.name} sends a message
              </AppText>
            </View>
            <Toggle
              value={settings.notifications}
              onValueChange={(val: boolean) => {
                updateSettings.mutate({ notifications: val });
              }}
              accessibilityLabel="Messages notifications"
            />
          </View>

          {/* Read Receipts Toggle (U-35: default off) */}
          <View
            style={[
              styles.settingItem,
              {
                borderTopColor: colors.border,
                borderTopWidth: StyleSheet.hairlineWidth,
                paddingTop: spacing.md,
              },
            ]}
          >
            <View style={styles.settingTextCol}>
              <AppText variant="callout" weight="500">
                Read receipts
              </AppText>
              <AppText variant="caption" color="textSecondary">
                When on for both of you, shows when messages have been read. Neither partner is ever
                pressured. (U-35)
              </AppText>
            </View>
            <Toggle
              value={settings.readReceipts}
              onValueChange={(val: boolean) => {
                updateSettings.mutate({ readReceipts: val });
              }}
              accessibilityLabel="Read receipts setting"
            />
          </View>

          {/* Typing indicator toggle */}
          <View
            style={[
              styles.settingItem,
              {
                borderTopColor: colors.border,
                borderTopWidth: StyleSheet.hairlineWidth,
                paddingTop: spacing.md,
              },
            ]}
          >
            <View style={styles.settingTextCol}>
              <AppText variant="callout" weight="500">
                Typing indicator
              </AppText>
              <AppText variant="caption" color="textSecondary">
                Show when you're typing in this conversation
              </AppText>
            </View>
            <Toggle
              value={settings.typingIndicators}
              onValueChange={(val: boolean) => {
                updateSettings.mutate({ typingIndicators: val });
              }}
              accessibilityLabel="Typing indicator setting"
            />
          </View>
        </Animated.View>

        {/* Shared Media Gallery Section */}
        <Animated.View {...enter(4)} style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <View style={styles.mediaHeaderRow}>
            <AppText variant="headline" weight="600">
              Shared media
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {allMedia.length} item{allMedia.length === 1 ? "" : "s"}
            </AppText>
          </View>

          {/* Filter tabs */}
          <Segmented<MediaFilter>
            label="Filter media"
            value={mediaFilter}
            onChange={setMediaFilter}
            options={[
              { value: "all", label: "All" },
              { value: "photo", label: "Photos" },
              { value: "video", label: "Videos" },
              { value: "voice", label: "Voice" },
            ]}
          />

          {/* Media Grid */}
          {filteredMedia.length === 0 ? (
            <View style={[styles.emptyMedia, { paddingVertical: spacing.xl }]}>
              <Icon name="image" size={28} color={colors.textTertiary} />
              <AppText variant="caption" color="textSecondary">
                No media in this category.
              </AppText>
            </View>
          ) : (
            <View style={[styles.mediaGrid, { gap: spacing.sm }]}>
              {filteredMedia.map((item) => {
                if (!item.media) return null;
                const media = item.media;
                if (media.type === "voice") {
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        playVoice(item.id, media.seconds);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Voice note: ${formatDuration(media.seconds)}`}
                      style={[
                        styles.voiceCell,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.border,
                          borderRadius: radii.md,
                          padding: spacing.sm,
                        },
                      ]}
                    >
                      <Icon name="mic" size={20} color={colors.accent} />
                      <AppText variant="caption" weight="600" style={{ marginTop: 4 }}>
                        {formatDuration(media.seconds)}
                      </AppText>
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      openMedia({
                        type: media.type,
                        art: media.art,
                        caption: media.caption,
                        seconds: media.type === "video" ? media.seconds : undefined,
                        authorName: item.senderId === summary?.partner.name ? partner.name : "You",
                      });
                    }}
                    accessibilityRole="image"
                    accessibilityLabel={`${media.type === "video" ? "Video" : "Photo"} item`}
                    style={[styles.mediaCell, { borderRadius: radii.md }]}
                  >
                    <MediaArt
                      art={media.art}
                      {...(media.type === "video" ? { seconds: media.seconds } : {})}
                      height={96}
                      radius={radii.md}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>
      </GlassScreen>

      {/* Pinned Sheet */}
      <PinnedSheet
        visible={pinnedSheetOpen}
        pinnedMessages={pinned}
        viewerZone={partner.zone}
        onClose={() => {
          setPinnedSheetOpen(false);
        }}
        onSelectMessage={() => {
          setPinnedSheetOpen(false);
          router.back();
        }}
        onUnpin={(msg) => {
          togglePin.mutate(msg.id);
        }}
      />

      {/* Search Modal */}
      <ChatSearchModal
        visible={searchModalOpen}
        messages={messages}
        viewerZone={partner.zone}
        onClose={() => {
          setSearchModalOpen(false);
        }}
        onSelectResult={() => {
          setSearchModalOpen(false);
          router.back();
        }}
      />
    </View>
  );
}

export function ConversationDetailsScreen() {
  return (
    <SideScope side="garnet">
      <ConversationDetailsContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    flex: 1,
  },
  profileCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  linksGroup: {
    marginTop: 18,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  linkLeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  settingsCard: {
    marginTop: 18,
    borderWidth: 1,
    gap: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  settingTextCol: {
    flex: 1,
    gap: 2,
  },
  mediaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  mediaCell: {
    width: "31.5%",
    overflow: "hidden",
  },
  voiceCell: {
    width: "31.5%",
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyMedia: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
