import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
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
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** A short title in the sheet (one or two words). */
  title?: string;
  /** Art that peeks over the top edge (the viewer's character, P-55). Decorative. */
  peek?: ReactNode;
  /** Pinned under the scrolling content (the sheet's action). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * A liquid glass bottom sheet (HOME-03 pattern, reused by Days and Us): springs up over a soft
 * scrim; drag the handle down, tap outside or press Android back to close. Tall content scrolls
 * inside the sheet (never `flex: 1` in the scroll content; apps/mobile rule 11). Announced as a
 * modal. Reduced motion: it fades in.
 */
export function Sheet({ visible, onClose, title, peek, footer, children }: SheetProps) {
  const { colors, radii, spacing, motion, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const drag = useSharedValue(0);

  const close = () => {
    drag.set(0);
    onClose();
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
              <Animated.View style={sheetStyle}>
                {peek === undefined ? null : (
                  <View pointerEvents="none" style={styles.peek}>
                    {peek}
                  </View>
                )}
                <Glass radius={radii.xl + 4}>
                  <GestureDetector gesture={pan}>
                    <View style={styles.handleArea} accessibilityLabel="Drag down to close">
                      <View style={[styles.grabber, { backgroundColor: colors.glassRimEnd }]} />
                    </View>
                  </GestureDetector>
                  {title === undefined ? null : (
                    <AppText
                      variant="headline"
                      style={[styles.title, { paddingHorizontal: spacing.xl }]}
                    >
                      {title}
                    </AppText>
                  )}
                  <ScrollView
                    style={{ maxHeight: height * 0.72 }}
                    contentContainerStyle={{
                      paddingHorizontal: spacing.xl,
                      paddingTop: spacing.md,
                      paddingBottom: footer === undefined ? spacing.xl : spacing.md,
                      gap: spacing.lg,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    {children}
                  </ScrollView>
                  {footer === undefined ? null : (
                    <View
                      style={{
                        paddingHorizontal: spacing.xl,
                        paddingBottom: spacing.xl,
                        gap: spacing.sm,
                      }}
                    >
                      {footer}
                    </View>
                  )}
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
  peek: { position: "absolute", top: -92, right: 18, zIndex: 2 },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  title: { textAlign: "center" },
});

/** One row in a sheet's action list ("Edit", "Delete"): an icon in a soft disc and a label. */
export function SheetAction({
  icon,
  label,
  onPress,
  destructive = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const { colors, radii, spacing } = useTheme();
  const tone = destructive ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        actionStyles.row,
        {
          gap: spacing.md,
          borderRadius: radii.lg,
          backgroundColor: pressed ? colors.glassHighlight : "transparent",
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={[actionStyles.disc, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={19} color={tone} />
      </View>
      <AppText variant="body" weight="500" color={destructive ? "danger" : "textPrimary"}>
        {label}
      </AppText>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 6 },
  disc: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
