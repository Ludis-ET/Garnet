import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useOptionalToast } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import { dateGroupLabel, isMessageEditable, type ChatMedia, type ChatMessage } from "@/domain/chat";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ChatMediaSheet } from "./components/ChatMediaSheet";
import { DeleteDialog, type DeleteMode } from "./components/DeleteDialog";
import { MessageBubble } from "./components/MessageBubble";
import { MessageContextMenu } from "./components/MessageContextMenu";
import { MessageDetailsSheet } from "./components/MessageDetailsSheet";
import { PinnedSheet } from "./components/PinnedSheet";
import { TypingIndicator } from "./components/TypingIndicator";
import {
  useChatMessages,
  useChatSettings,
  useChatSummary,
  useDeleteMessage,
  useEditMessage,
  usePinnedMessages,
  useRetryMessage,
  useSendMessage,
  useTogglePin,
  useToggleReaction,
} from "./useChat";

interface TimelineItem {
  key: string;
  type: "date-separator" | "message";
  dateLabel?: string;
  message?: ChatMessage;
}

function ConversationContent() {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii, scheme } = useTheme();
  const now = useNow();
  const toast = useOptionalToast();

  const summaryQuery = useChatSummary();
  const messagesQuery = useChatMessages();
  const settingsQuery = useChatSettings();
  const pinnedQuery = usePinnedMessages();

  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const togglePin = useTogglePin();
  const toggleReaction = useToggleReaction();
  const retryMessage = useRetryMessage();

  // Composer states
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);

  // Overlay states
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<ChatMessage | null>(null);
  const [selectedMsgForDelete, setSelectedMsgForDelete] = useState<ChatMessage | null>(null);
  const [selectedMsgForDetails, setSelectedMsgForDetails] = useState<ChatMessage | null>(null);
  const [pinnedSheetOpen, setPinnedSheetOpen] = useState(false);
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);

  // Scroll state
  const [showScrollDown, setShowScrollDown] = useState(false);
  const flatListRef = useRef<FlatList<TimelineItem>>(null);

  const summary = summaryQuery.data;
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const settings = settingsQuery.data;
  const pinned = pinnedQuery.data ?? [];

  const partner = summary?.partner ?? { name: "Noah", side: "sapphire", zone: "Europe/London" };
  const readReceipts = settings?.readReceipts ?? false;

  // Build flattened timeline with date separators
  const timelineData = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    let lastDateLabel: string | null = null;

    for (const msg of messages) {
      if (msg.deletedForMe) continue;
      const label = dateGroupLabel(msg.createdAt, now, partner.zone);
      if (label !== lastDateLabel) {
        items.push({
          key: `date-${label}-${msg.id}`,
          type: "date-separator",
          dateLabel: label,
        });
        lastDateLabel = label;
      }
      items.push({
        key: msg.id,
        type: "message",
        message: msg,
      });
    }

    return items;
  }, [messages, now, partner.zone]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !editingMsg) return;

    if (editingMsg) {
      editMessage.mutate(
        { id: editingMsg.id, text },
        {
          onSuccess: () => {
            setEditingMsg(null);
            setInputText("");
            toast?.show("Message updated", "success");
          },
          onError: () => {
            toast?.show("Could not update message", "error");
          },
        },
      );
      return;
    }

    sendMessage.mutate(
      {
        text,
        replyToId: replyingTo?.id,
      },
      {
        onSuccess: () => {
          setInputText("");
          setReplyingTo(null);
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        onError: () => {
          toast?.show("Could not send message", "error");
        },
      },
    );
  };

  const handleSendMedia = (media: ChatMedia) => {
    sendMessage.mutate(
      {
        text: media.caption,
        media,
        replyToId: replyingTo?.id,
      },
      {
        onSuccess: () => {
          setReplyingTo(null);
          flatListRef.current?.scrollToEnd({ animated: true });
        },
        onError: () => {
          toast?.show("Could not send media", "error");
        },
      },
    );
  };

  const handleSaveVoice = (voiceMedia: Extract<DemoMedia, { type: "voice" }>) => {
    handleSendMedia(voiceMedia);
    setVoiceRecorderOpen(false);
  };

  const handleDeleteConfirm = (mode: DeleteMode) => {
    if (!selectedMsgForDelete) return;
    deleteMessage.mutate(
      { id: selectedMsgForDelete.id, mode },
      {
        onSuccess: () => {
          setSelectedMsgForDelete(null);
          toast?.show("Message deleted", "success");
        },
        onError: () => {
          toast?.show("Could not delete message", "error");
        },
      },
    );
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsg(msg);
    setInputText(msg.text);
    setReplyingTo(null);
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setInputText("");
  };

  const canEditSelected = selectedMsgForMenu
    ? isMessageEditable(selectedMsgForMenu, DEMO_ME_ID, now)
    : false;

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollDown(false);
  };

  const scrollToMessage = (targetId: string) => {
    const idx = timelineData.findIndex((i) => i.message?.id === targetId);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    }
  };

  if (summaryQuery.isLoading || messagesQuery.isLoading) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator accessibilityLabel="Loading conversation" />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Compact iOS Header (CHAT-01) */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 14),
            paddingHorizontal: spacing.sm,
            paddingBottom: spacing.sm,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <IconButton
          icon="chevron-left"
          label="Back to messages"
          onPress={() => {
            router.back();
          }}
        />

        <Pressable
          onPress={() => {
            router.push("/us/chat-details");
          }}
          accessibilityRole="button"
          accessibilityLabel={`${partner.name}, local time in London. Tap for conversation details`}
          style={styles.headerPartner}
        >
          <ProfileAvatar
            avatar={{ kind: "initials", swatch: 1 }}
            name={partner.name}
            side={partner.side ?? "sapphire"}
            size={36}
          />
          <View style={styles.headerInfo}>
            <AppText variant="headline" weight="600">
              {partner.name}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              18:42 in London
            </AppText>
          </View>
        </Pressable>

        <IconButton
          icon="info"
          label="Conversation details"
          onPress={() => {
            router.push("/us/chat-details");
          }}
        />
      </View>

      {/* Pinned banner if pinned messages exist (CHAT-01) */}
      {pinned.length > 0 ? (
        <Pressable
          onPress={() => {
            setPinnedSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${pinned.length} pinned message${pinned.length > 1 ? "s" : ""}. Tap to view`}
          style={[
            styles.pinnedBanner,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              paddingHorizontal: spacing.gutter,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <Icon name="pin" size={14} color={colors.accent} />
          <AppText variant="caption" weight="600" color="accent" style={styles.flex}>
            {pinned.length} pinned
          </AppText>
          <Icon name="chevron-right" size={14} color={colors.textTertiary} />
        </Pressable>
      ) : null}

      {/* Main Conversation Timeline (FlatList) */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={timelineData}
          keyExtractor={(item) => item.key}
          initialNumToRender={50}
          maxToRenderPerBatch={50}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: spacing.md,
              paddingBottom: spacing.lg,
            },
          ]}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            const contentHeight = e.nativeEvent.contentSize.height;
            const layoutHeight = e.nativeEvent.layoutMeasurement.height;
            const isScrolledUp = contentHeight - offsetY - layoutHeight > 180;
            setShowScrollDown(isScrolledUp);
          }}
          scrollEventThrottle={100}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { paddingVertical: spacing.hero }]}>
              <View
                style={[
                  styles.emptyCircle,
                  { backgroundColor: colors.accentSoft, borderRadius: radii.xl },
                ]}
              >
                <Icon name="chat" size={32} color={colors.accent} />
              </View>
              <AppText variant="title" weight="600" style={styles.centerText}>
                Say hello 💜
              </AppText>
              <AppText variant="callout" color="textSecondary" style={styles.centerText}>
                Start a warm conversation with {partner.name}.
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "date-separator") {
              return (
                <View style={styles.dateSeparatorRow}>
                  <View
                    style={[
                      styles.dateBadge,
                      {
                        backgroundColor: colors.surfaceRaised,
                        borderColor: colors.border,
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <AppText variant="caption" color="textSecondary" weight="500">
                      {item.dateLabel}
                    </AppText>
                  </View>
                </View>
              );
            }

            if (!item.message) return null;
            const msg = item.message;
            const isMine = msg.senderId === DEMO_ME_ID;

            return (
              <MessageBubble
                message={msg}
                isMine={isMine}
                partnerName={partner.name}
                viewerZone={partner.zone}
                readReceiptsEnabled={readReceipts}
                onLongPress={(m) => {
                  setSelectedMsgForMenu(m);
                }}
                onToggleReaction={(emoji) => {
                  toggleReaction.mutate({ messageId: msg.id, emoji });
                }}
                onRetry={() => {
                  retryMessage.mutate(msg.id);
                }}
              />
            );
          }}
          ListFooterComponent={
            // Live typing indicator
            settings?.typingIndicators ? <TypingIndicator partnerName={partner.name} /> : null
          }
        />

        {/* Floating scroll-to-latest pill */}
        {showScrollDown ? (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.scrollDownWrapper, { right: spacing.gutter }]}
          >
            <Pressable
              onPress={scrollToBottom}
              accessibilityRole="button"
              accessibilityLabel="Scroll to latest messages"
              style={[
                styles.scrollDownBtn,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <View style={styles.downIcon}>
                <Icon name="chevron-right" size={16} color={colors.textPrimary} />
              </View>
              <AppText variant="caption" weight="600">
                Latest
              </AppText>
            </Pressable>
          </Animated.View>
        ) : null}

        <View
          style={[
            styles.composerContainer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.glassRimStart,
              paddingBottom: Math.max(insets.bottom, 12),
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          {/* Top liquid glass specular line */}
          <LinearGradient
            colors={[colors.glassSheen, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.composerSheen}
            pointerEvents="none"
          />
          {/* Reply Quote Bar */}
          {replyingTo ? (
            <Animated.View
              entering={FadeIn}
              style={[styles.replyBar, { backgroundColor: colors.surfaceRaised }]}
            >
              <View style={[styles.replyAccent, { backgroundColor: colors.accent }]} />
              <View style={styles.replyContent}>
                <AppText variant="caption" weight="600" color="accent">
                  Replying to {replyingTo.senderId === DEMO_ME_ID ? "yourself" : partner.name}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {replyingTo.text.length > 0
                    ? replyingTo.text
                    : (replyingTo.media?.caption ?? "Media")}
                </AppText>
              </View>
              <IconButton
                icon="x"
                label="Cancel reply"
                onPress={() => {
                  setReplyingTo(null);
                }}
              />
            </Animated.View>
          ) : null}

          {/* Edit Message Bar (CHAT-03) */}
          {editingMsg ? (
            <Animated.View
              entering={FadeIn}
              style={[styles.editBar, { backgroundColor: colors.surfaceRaised }]}
            >
              <View style={[styles.replyAccent, { backgroundColor: colors.garnet }]} />
              <View style={styles.replyContent}>
                <AppText variant="caption" weight="600" color="accent">
                  Editing message
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {editingMsg.text}
                </AppText>
              </View>
              <IconButton icon="x" label="Cancel editing" onPress={handleCancelEdit} />
            </Animated.View>
          ) : null}

          {/* Input Controls Row */}
          <View style={styles.inputRow}>
            {/* Media button */}
            <IconButton
              icon="plus"
              label="Share media"
              onPress={() => {
                setMediaSheetOpen(true);
              }}
            />

            {/* Multiline Text Input */}
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderRadius: radii.xl,
                },
              ]}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message"
                placeholderTextColor={colors.textTertiary}
                multiline
                accessibilityLabel="Message input field"
                style={[styles.textInput, { color: colors.textPrimary }]}
              />
            </View>

            {/* Voice or Send button */}
            {inputText.trim().length > 0 || editingMsg ? (
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleSend();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={editingMsg ? "Save edited message" : "Send message"}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radii.pill,
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                      shadowColor: colors.shadow,
                      shadowOpacity: scheme === "dark" ? 0.3 : 0.1,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                    },
                  ]}
                >
                  <Icon name={editingMsg ? "check" : "send"} size={16} color={colors.onAccent} />
                </Pressable>
              </Animated.View>
            ) : (
              <IconButton
                icon="mic"
                label="Record voice note"
                onPress={() => {
                  setVoiceRecorderOpen(true);
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Context Menu (CHAT-02) */}
      <MessageContextMenu
        message={selectedMsgForMenu}
        visible={Boolean(selectedMsgForMenu)}
        isMine={selectedMsgForMenu?.senderId === DEMO_ME_ID}
        canEdit={canEditSelected}
        onClose={() => {
          setSelectedMsgForMenu(null);
        }}
        onReply={(msg) => {
          setReplyingTo(msg);
        }}
        onEdit={(msg) => {
          handleStartEdit(msg);
        }}
        onTogglePin={(msg) => {
          togglePin.mutate(msg.id);
        }}
        onToggleReaction={(msg, emoji) => {
          toggleReaction.mutate({ messageId: msg.id, emoji });
        }}
        onOpenDetails={(msg) => {
          setSelectedMsgForDetails(msg);
        }}
        onDeletePress={(msg) => {
          setSelectedMsgForDelete(msg);
        }}
      />

      {/* Delete Dialogs (CHAT-04) */}
      <DeleteDialog
        visible={Boolean(selectedMsgForDelete)}
        partnerName={partner.name}
        canDeleteForEveryone={selectedMsgForDelete?.senderId === DEMO_ME_ID}
        onClose={() => {
          setSelectedMsgForDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Pinned Messages Sheet (CHAT-05) */}
      <PinnedSheet
        visible={pinnedSheetOpen}
        pinnedMessages={pinned}
        viewerZone={partner.zone}
        onClose={() => {
          setPinnedSheetOpen(false);
        }}
        onSelectMessage={(msg) => {
          scrollToMessage(msg.id);
        }}
        onUnpin={(msg) => {
          togglePin.mutate(msg.id);
        }}
      />

      {/* Message Details Sheet (CHAT-07) */}
      <MessageDetailsSheet
        visible={Boolean(selectedMsgForDetails)}
        message={selectedMsgForDetails}
        myZone="Africa/Addis_Ababa"
        partnerZone={partner.zone}
        readReceiptsEnabled={readReceipts}
        onClose={() => {
          setSelectedMsgForDetails(null);
        }}
      />

      {/* Media Picker Sheet (CHAT-08) */}
      <ChatMediaSheet
        visible={mediaSheetOpen}
        partnerName={partner.name}
        onPick={handleSendMedia}
        onVoice={() => {
          setVoiceRecorderOpen(true);
        }}
        onClose={() => {
          setMediaSheetOpen(false);
        }}
      />

      {/* Voice Recorder Sheet (CHAT-08) */}
      <VoiceRecorderSheet
        visible={voiceRecorderOpen}
        onSave={handleSaveVoice}
        onClose={() => {
          setVoiceRecorderOpen(false);
        }}
      />
    </View>
  );
}

export function ConversationScreen() {
  return (
    <SideScope side="garnet">
      <ConversationContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerPartner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerInfo: {
    alignItems: "center",
  },
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  dateSeparatorRow: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyCircle: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  scrollDownWrapper: {
    position: "absolute",
    bottom: 84,
  },
  scrollDownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  downIcon: {
    transform: [{ rotate: "90deg" }],
  },
  composerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    position: "relative",
  },
  composerSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.7,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  editBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  replyAccent: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
  },
  replyContent: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputBox: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
});
