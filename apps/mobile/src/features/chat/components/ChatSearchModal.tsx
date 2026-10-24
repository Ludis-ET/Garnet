import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { formatMessageTime, searchChatMessages, type ChatMessage } from "@/domain/chat";
import { useTheme } from "@/theme/ThemeProvider";

export function ChatSearchModal({
  visible,
  messages,
  viewerZone = "Europe/London",
  onClose,
  onSelectResult,
}: {
  visible: boolean;
  messages: ChatMessage[];
  viewerZone?: string;
  onClose: () => void;
  onSelectResult: (msg: ChatMessage) => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  if (!visible) return null;

  const results = searchChatMessages(messages, query);
  const totalMatches = results.length;

  const handlePrev = () => {
    if (totalMatches === 0) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalMatches - 1));
  };

  const handleNext = () => {
    if (totalMatches === 0) return;
    setActiveIndex((prev) => (prev < totalMatches - 1 ? prev + 1 : 0));
  };

  const handleJump = (msg: ChatMessage) => {
    onSelectResult(msg);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Glassy Search Header with input and steppers */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingHorizontal: spacing.gutter,
              paddingBottom: spacing.sm,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceRaised, borderRadius: radii.pill },
            ]}
          >
            <Icon name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setActiveIndex(0);
              }}
              placeholder="Search conversation"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              accessibilityLabel="Search conversation"
              style={[styles.input, { color: colors.textPrimary }]}
            />
            {query ? (
              <Pressable
                onPress={() => {
                  setQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search input"
                hitSlop={8}
              >
                <Icon name="x" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <IconButton icon="x" label="Close search" onPress={onClose} />
        </View>

        {/* Stepper info row if matches found */}
        {totalMatches > 0 ? (
          <View
            style={[
              styles.stepperBar,
              {
                paddingHorizontal: spacing.gutter,
                paddingVertical: spacing.xs,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <AppText variant="caption" color="textSecondary">
              Match {activeIndex + 1} of {totalMatches}
            </AppText>
            <View style={styles.stepperButtons}>
              <Pressable
                onPress={handlePrev}
                accessibilityRole="button"
                accessibilityLabel="Previous match"
                hitSlop={8}
                style={[styles.stepperBtn, { backgroundColor: colors.surfaceRaised }]}
              >
                <Icon name="chevron-left" size={16} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={handleNext}
                accessibilityRole="button"
                accessibilityLabel="Next match"
                hitSlop={8}
                style={[styles.stepperBtn, { backgroundColor: colors.surfaceRaised }]}
              >
                <Icon name="chevron-right" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Results list or empty state */}
        <ScrollView contentContainerStyle={{ padding: spacing.gutter, gap: spacing.sm }}>
          {query.trim() === "" ? (
            <View style={[styles.centerBox, { paddingVertical: spacing.xxxl }]}>
              <Icon name="search" size={32} color={colors.textTertiary} />
              <AppText variant="callout" color="textSecondary" style={styles.centerText}>
                Type to search messages and captions.
              </AppText>
            </View>
          ) : totalMatches === 0 ? (
            <View style={[styles.centerBox, { paddingVertical: spacing.xxxl }]}>
              <Icon name="alert" size={32} color={colors.textTertiary} />
              <AppText variant="headline" style={styles.centerText}>
                Nothing found.
              </AppText>
              <AppText variant="callout" color="textSecondary" style={styles.centerText}>
                Try another word.
              </AppText>
            </View>
          ) : (
            results.map((msg, idx) => {
              const isSelected = idx === activeIndex;
              const timeStr = formatMessageTime(msg.createdAt, viewerZone);
              const preview = msg.text ? msg.text : (msg.media?.caption ?? "Shared media");

              return (
                <Pressable
                  key={msg.id}
                  onPress={() => {
                    handleJump(msg);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Result: ${preview}, sent at ${timeStr}. Tap to jump`}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: isSelected ? colors.accentSoft : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderRadius: radii.md,
                      padding: spacing.md,
                    },
                  ]}
                >
                  <AppText variant="body" weight={isSelected ? "600" : "400"}>
                    {preview}
                  </AppText>
                  <AppText variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                    {timeStr}
                  </AppText>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  stepperBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepperButtons: {
    flexDirection: "row",
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centerText: {
    textAlign: "center",
  },
  resultCard: {
    borderWidth: 1,
  },
});
