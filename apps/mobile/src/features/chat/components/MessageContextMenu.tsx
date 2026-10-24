import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Modal, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useOptionalToast } from "@/components/ui/Toast";
import type { ChatMessage } from "@/domain/chat";
import { useTheme } from "@/theme/ThemeProvider";

const REACTION_PALETTE = ["❤️", "✨", "🥺", "🫂", "🌸", "💜"] as const;

interface MenuActionItem {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function MessageContextMenu({
  message,
  canEdit,
  visible,
  onClose,
  onReply,
  onEdit,
  onTogglePin,
  onToggleReaction,
  onOpenDetails,
  onDeletePress,
}: {
  message: ChatMessage | null;
  isMine?: boolean;
  canEdit: boolean;
  visible: boolean;
  onClose: () => void;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onTogglePin: (msg: ChatMessage) => void;
  onToggleReaction: (msg: ChatMessage, emoji: string) => void;
  onOpenDetails: (msg: ChatMessage) => void;
  onDeletePress: (msg: ChatMessage) => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const toast = useOptionalToast();

  if (!visible || !message) return null;

  const handleCopy = async () => {
    const textToCopy = message.text || (message.media?.caption ?? "");
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      toast?.show("Copied to clipboard", "success");
    }
    onClose();
  };

  const handleSaveMemory = () => {
    toast?.show("Saved to Memories 💜", "success");
    onClose();
  };

  const hasMedia = Boolean(message.media);

  const actions: MenuActionItem[] = [
    {
      icon: "chat",
      label: "Reply",
      onPress: () => {
        onReply(message);
        onClose();
      },
    },
    ...(canEdit
      ? [
          {
            icon: "edit" as IconName,
            label: "Edit",
            onPress: () => {
              onEdit(message);
              onClose();
            },
          },
        ]
      : []),
    {
      icon: "pin",
      label: message.pinned ? "Unpin message" : "Pin message",
      onPress: () => {
        onTogglePin(message);
        onClose();
      },
    },
    ...(message.text || message.media?.caption
      ? [
          {
            icon: "copy" as IconName,
            label: "Copy",
            onPress: handleCopy,
          },
        ]
      : []),
    ...(hasMedia
      ? [
          {
            icon: "heart" as IconName,
            label: "Save as memory",
            onPress: handleSaveMemory,
          },
        ]
      : []),
    {
      icon: "info",
      label: "Details",
      onPress: () => {
        onOpenDetails(message);
        onClose();
      },
    },
    {
      icon: "trash",
      label: "Delete",
      destructive: true,
      onPress: () => {
        onDeletePress(message);
        onClose();
      },
    },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close context menu"
      >
        <Animated.View
          entering={reduceMotion ? FadeIn.duration(120) : FadeIn.duration(200)}
          exiting={reduceMotion ? FadeOut.duration(100) : FadeOut.duration(150)}
          style={[styles.container, { paddingHorizontal: spacing.gutter }]}
        >
          {/* Lifted Message Highlight Preview */}
          <Glass
            radius={radii.lg}
            tint="garnet"
            shadow
            contentStyle={[styles.previewBox, { padding: spacing.md }]}
          >
            <AppText variant="footnote" color="textSecondary" numberOfLines={3}>
              {message.text.length > 0 ? message.text : (message.media?.caption ?? "Shared media")}
            </AppText>
          </Glass>

          {/* Liquid Glass Reaction Bar (CHAT-02) */}
          <Glass radius={radii.pill} shadow contentStyle={styles.reactionBar}>
            {REACTION_PALETTE.map((emoji, index) => (
              <Animated.View
                key={emoji}
                {...(reduceMotion
                  ? {}
                  : {
                      entering: FadeInDown.delay(index * 35)
                        .springify()
                        .damping(13)
                        .mass(0.6),
                    })}
              >
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleReaction(message, emoji);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                  style={({ pressed }) => [
                    styles.reactionBtn,
                    { transform: [{ scale: pressed ? 1.35 : 1 }] },
                  ]}
                >
                  <AppText style={styles.reactionText}>{emoji}</AppText>
                </Pressable>
              </Animated.View>
            ))}
          </Glass>

          {/* Action List below */}
          <Glass radius={radii.xl} shadow contentStyle={styles.menuBox}>
            {actions.map((act, index) => (
              <Pressable
                key={act.label}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  act.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={act.label}
                style={({ pressed }) => [
                  styles.menuRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < actions.length - 1 ? StyleSheet.hairlineWidth : 0,
                    backgroundColor: pressed ? colors.accentSoft : "transparent",
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
              >
                <AppText
                  variant="callout"
                  color={act.destructive ? "danger" : "textPrimary"}
                  weight={act.destructive ? "600" : "500"}
                  style={styles.flex}
                >
                  {act.label}
                </AppText>
                <Icon
                  name={act.icon}
                  size={18}
                  color={act.destructive ? colors.danger : colors.textSecondary}
                />
              </Pressable>
            ))}
          </Glass>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 4, 9, 0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  previewBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  reactionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reactionBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionText: {
    fontSize: 27,
  },
  menuBox: {
    paddingVertical: 6,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flex: {
    flex: 1,
  },
});
