import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { formatMessageTime } from "@/domain/chat";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ChatSearchModal } from "./components/ChatSearchModal";
import { PinnedSheet } from "./components/PinnedSheet";
import { useChatMessages, useChatSummary, usePinnedMessages, useTogglePin } from "./useChat";

function ConversationListContent() {
  const { colors, spacing, radii, reduceMotion } = useTheme();
  const summaryQuery = useChatSummary();
  const messagesQuery = useChatMessages();
  const pinnedQuery = usePinnedMessages();
  const togglePin = useTogglePin();

  const [pinnedSheetOpen, setPinnedSheetOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  if (summaryQuery.isLoading || messagesQuery.isLoading) {
    return (
      <GlassScreen>
        <View style={styles.center}>
          <ActivityIndicator accessibilityLabel="Loading messages" />
        </View>
      </GlassScreen>
    );
  }

  const summary = summaryQuery.data;
  const messages = messagesQuery.data ?? [];
  const pinned = pinnedQuery.data ?? [];
  const lastMsg = summary?.lastMessage;
  const partner = summary?.partner ?? { name: "Noah", side: "sapphire", zone: "Europe/London" };

  const lastTime = lastMsg ? formatMessageTime(lastMsg.createdAt, partner.zone) : "";
  const lastSnippet = lastMsg
    ? lastMsg.deletedForEveryone
      ? "This message was removed."
      : lastMsg.text ||
        (lastMsg.media?.caption
          ? `📷 ${lastMsg.media.caption}`
          : lastMsg.media
            ? `Shared ${lastMsg.media.type}`
            : "")
    : "";

  const hasMessages = messages.length > 0;
  const hasUnread = (summary?.unreadCount ?? 0) > 0;

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
        {/* Navigation & Header */}
        <Animated.View {...enter(0)} style={[styles.headerRow, { gap: spacing.sm }]}>
          <IconButton
            icon="chevron-left"
            label="Back to Us"
            onPress={() => {
              router.back();
            }}
          />
          <AppText variant="largeTitle" style={styles.titleText}>
            Messages
          </AppText>
        </Animated.View>

        {/* Conversation Row (Single conversation only: exactly two partners) */}
        {hasMessages ? (
          <Animated.View {...enter(1)}>
            <Pressable
              onPress={() => {
                router.push("/us/chat");
              }}
              accessibilityRole="button"
              accessibilityLabel={`Conversation with ${partner.name}. Last message: ${lastSnippet}. Sent at ${lastTime}`}
              style={({ pressed }) => [
                styles.convoRow,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderRadius: radii.lg,
                  padding: spacing.md,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <ProfileAvatar
                avatar={{ kind: "initials", swatch: 1 }}
                name={partner.name}
                side={partner.side ?? "sapphire"}
                size={54}
              />

              <View style={[styles.convoInfo, { gap: 2 }]}>
                <View style={styles.nameRow}>
                  <AppText variant="headline" weight="600">
                    {partner.name}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {lastTime}
                  </AppText>
                </View>

                <View style={styles.previewRow}>
                  <AppText
                    variant="callout"
                    color={hasUnread ? "textPrimary" : "textSecondary"}
                    weight={hasUnread ? "600" : "400"}
                    numberOfLines={1}
                    style={styles.snippetText}
                  >
                    {lastSnippet}
                  </AppText>

                  {hasUnread ? (
                    <View
                      accessibilityLabel="Unread messages"
                      style={[styles.unreadDot, { backgroundColor: colors.accent }]}
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          /* Empty state: Say hello 💜 */
          <Animated.View {...enter(1)} style={[styles.emptyBox, { paddingVertical: spacing.xxl }]}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.accentSoft, borderRadius: radii.xl },
              ]}
            >
              <Icon name="chat" size={32} color={colors.accent} />
            </View>
            <AppText variant="title" weight="600" style={styles.centerText}>
              Say hello 💜
            </AppText>
            <AppText variant="callout" color="textSecondary" style={styles.centerText}>
              Your private conversation with {partner.name} starts here.
            </AppText>
            <Pressable
              onPress={() => {
                router.push("/us/chat");
              }}
              accessibilityRole="button"
              accessibilityLabel="Start chat"
              style={[
                styles.startBtn,
                { backgroundColor: colors.accent, borderRadius: radii.pill },
              ]}
            >
              <AppText variant="callout" weight="600" color="onAccent">
                Open chat
              </AppText>
            </Pressable>
          </Animated.View>
        )}

        {/* Quiet shortcuts beneath */}
        <Animated.View {...enter(2)} style={[styles.shortcutsGroup, { gap: spacing.sm }]}>
          {/* Pinned Messages shortcut */}
          <Pressable
            onPress={() => {
              setPinnedSheetOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Pinned messages, ${summary?.pinnedCount ?? 0} saved`}
            style={({ pressed }) => [
              styles.shortcutRow,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.shortcutLeading}>
              <Icon name="pin" size={18} color={colors.accent} />
              <AppText variant="callout" weight="500">
                Pinned
              </AppText>
            </View>
            <View style={styles.shortcutTrailing}>
              {(summary?.pinnedCount ?? 0) > 0 ? (
                <View style={[styles.countPill, { backgroundColor: colors.accentSoft }]}>
                  <AppText variant="caption" weight="600" color="accent">
                    {summary?.pinnedCount}
                  </AppText>
                </View>
              ) : null}
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          {/* Shared Media shortcut */}
          <Pressable
            onPress={() => {
              router.push("/us/chat-details");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Shared media, ${summary?.mediaCount ?? 0} photos, videos and voices`}
            style={({ pressed }) => [
              styles.shortcutRow,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.shortcutLeading}>
              <Icon name="image" size={18} color={colors.sapphire} />
              <AppText variant="callout" weight="500">
                Shared media
              </AppText>
            </View>
            <View style={styles.shortcutTrailing}>
              {(summary?.mediaCount ?? 0) > 0 ? (
                <View style={[styles.countPill, { backgroundColor: colors.surface }]}>
                  <AppText variant="caption" weight="600" color="textSecondary">
                    {summary?.mediaCount}
                  </AppText>
                </View>
              ) : null}
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </View>
          </Pressable>

          {/* Search Messages shortcut */}
          <Pressable
            onPress={() => {
              setSearchModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Search messages"
            style={({ pressed }) => [
              styles.shortcutRow,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                borderRadius: radii.md,
                padding: spacing.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View style={styles.shortcutLeading}>
              <Icon name="search" size={18} color={colors.ruby} />
              <AppText variant="callout" weight="500">
                Search messages
              </AppText>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textTertiary} />
          </Pressable>
        </Animated.View>
      </GlassScreen>

      {/* Pinned Messages Sheet */}
      <PinnedSheet
        visible={pinnedSheetOpen}
        pinnedMessages={pinned}
        viewerZone={partner.zone}
        onClose={() => {
          setPinnedSheetOpen(false);
        }}
        onSelectMessage={() => {
          setPinnedSheetOpen(false);
          router.push("/us/chat");
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
          router.push("/us/chat");
        }}
      />
    </View>
  );
}

export function ConversationListScreen() {
  return (
    <SideScope side="garnet">
      <ConversationListContent />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    flex: 1,
  },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 14,
  },
  convoInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  snippetText: {
    flex: 1,
    paddingRight: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  startBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  shortcutsGroup: {
    marginTop: 24,
  },
  shortcutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  shortcutLeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shortcutTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
