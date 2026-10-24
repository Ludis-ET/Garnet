import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { formatMessageTime, type ChatMessage } from "@/domain/chat";
import { useTheme } from "@/theme/ThemeProvider";

export function PinnedSheet({
  visible,
  pinnedMessages,
  viewerZone = "Europe/London",
  onClose,
  onSelectMessage,
  onUnpin,
}: {
  visible: boolean;
  pinnedMessages: ChatMessage[];
  viewerZone?: string;
  onClose: () => void;
  onSelectMessage: (msg: ChatMessage) => void;
  onUnpin: (msg: ChatMessage) => void;
}) {
  const { colors, spacing, radii } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title="Pinned messages">
      {pinnedMessages.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingVertical: spacing.xxl }]}>
          <Icon name="pin" size={32} color={colors.textTertiary} />
          <AppText variant="callout" color="textSecondary" style={styles.emptyText}>
            Pin a message to keep it close.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
          {pinnedMessages.map((msg) => {
            const timeStr = formatMessageTime(msg.createdAt, viewerZone);
            const previewText = msg.text
              ? msg.text
              : (msg.media?.caption ?? (msg.media ? `Shared ${msg.media.type}` : "Message"));

            return (
              <View
                key={msg.id}
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                  },
                ]}
              >
                <Pressable
                  onPress={() => {
                    onSelectMessage(msg);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Pinned message: ${previewText}, sent at ${timeStr}. Tap to jump`}
                  style={styles.itemContent}
                >
                  <AppText variant="body" numberOfLines={2} style={styles.itemText}>
                    {previewText}
                  </AppText>
                  <AppText variant="caption" color="textTertiary" style={styles.timeText}>
                    {timeStr}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUnpin(msg);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Unpin message"
                  hitSlop={10}
                  style={[styles.unpinBtn, { backgroundColor: colors.accentSoft }]}
                >
                  <Icon name="x" size={14} color={colors.accent} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    lineHeight: 20,
  },
  timeText: {
    marginTop: 4,
  },
  unpinBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
