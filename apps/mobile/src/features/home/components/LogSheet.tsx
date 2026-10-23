import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { TextField } from "@/components/ui/TextField";
import { useTheme } from "@/theme/ThemeProvider";

const EMOJI = ["☕", "💼", "🍝", "🚇", "📸", "❤️"] as const;

/**
 * HOME-03 · Log a moment. One field, six emoji, two explicit choices: "Share with Noah" or
 * "Keep private" (day-log rule 2: a moment is a private draft until shared). Drag the sheet
 * down (or tap outside) to close; text that was typed is kept as a private draft, never lost
 * (§5 forgiving UX).
 */
export function LogSheet({
  visible,
  partnerName,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  partnerName: string;
  saving: boolean;
  onSave: (moment: { text: string; emoji: string; share: boolean }) => void;
  /** Called with the unsaved text so it can be kept as a draft. */
  onClose: (unsaved: { text: string; emoji: string } | null) => void;
}) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState<string>(EMOJI[0]);
  const drag = useSharedValue(0);

  const close = () => {
    const unsaved = text.trim().length > 0 ? { text, emoji } : null;
    setText("");
    drag.set(0);
    onClose(unsaved);
  };
  const save = (share: boolean) => {
    onSave({ text, emoji, share });
    setText("");
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.set(Math.max(0, drag.get() + e.changeY));
    })
    .onEnd((e) => {
      if (drag.get() > 120 || e.velocityY > 900) scheduleOnRN(close);
      else drag.set(withSpring(0, motion.spring.smooth));
    });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.fill, { backgroundColor: colors.scrim }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.end}
          >
            <Animated.View
              {...(reduceMotion
                ? {}
                : { entering: SlideInDown.springify().damping(19).stiffness(190) })}
              accessibilityViewIsModal
              style={[
                styles.sheet,
                { padding: spacing.sm, paddingBottom: insets.bottom + spacing.sm },
              ]}
            >
              {/* The drag lives on its own view, so it never fights the slide-in animation. */}
              <Animated.View style={sheetStyle}>
                <View pointerEvents="none" style={styles.peek}>
                  <SideCharacter pose="writingLetter" size={112} />
                </View>
                <Glass radius={radii.xl + 4}>
                  <GestureDetector gesture={pan}>
                    <View style={styles.handleArea} accessibilityLabel="Drag down to close">
                      <View style={[styles.grabber, { backgroundColor: colors.glassRimEnd }]} />
                    </View>
                  </GestureDetector>
                  <View
                    style={{
                      paddingHorizontal: spacing.xl,
                      paddingBottom: spacing.xl,
                      gap: spacing.lg,
                    }}
                  >
                    <TextField
                      label="A small moment"
                      placeholder="What's happening?"
                      large
                      autoFocus
                      value={text}
                      onChangeText={setText}
                      returnKeyType="done"
                      maxLength={280}
                    />
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel="Feeling"
                      style={[styles.row, { gap: spacing.sm }]}
                    >
                      {EMOJI.map((e) => {
                        const on = e === emoji;
                        return (
                          <Pressable
                            key={e}
                            onPress={() => {
                              setEmoji(e);
                            }}
                            accessibilityRole="radio"
                            accessibilityLabel={e}
                            accessibilityState={{ checked: on }}
                            style={[
                              styles.chip,
                              {
                                borderColor: on ? colors.accent : colors.glassRimEnd,
                                backgroundColor: on ? colors.accentSoft : colors.glassVeilSoft,
                              },
                            ]}
                          >
                            <AppText variant="headline">{e}</AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Button
                      label={`Share with ${partnerName}`}
                      onPress={() => {
                        save(true);
                      }}
                      loading={saving}
                      disabled={text.trim().length === 0}
                    />
                    <Button
                      label="Keep private"
                      variant="text"
                      disabled={text.trim().length === 0 || saving}
                      onPress={() => {
                        save(false);
                      }}
                    />
                  </View>
                </Glass>
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  end: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 480, alignSelf: "center" },
  handleArea: { alignItems: "center", paddingVertical: 12 },
  peek: { position: "absolute", top: -96, right: 18, zIndex: 2 },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  chip: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
