import { BlurView } from "expo-blur";
import { Haptics } from "@/components/ui/haptics";
import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmojiBoard } from "@/features/emoji/EmojiBoard";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, POP } from "@/theme/transitions";

/** Where a message sits on screen (window coordinates), to lift it in place. */
export interface MessageAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MenuAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** The quick reactions over a held message; the chevron opens every emoji. */
export const QUICK_REACTIONS = ["❤️", "🥰", "😂", "😮", "🥺", "🙏", "🔥"] as const;

const BAR_H = 52;
const GAP = 8;
const ROW_H = 46;
const MENU_W = 236;
const BOARD_H = 330;

/**
 * CHAT-02 · Hold (or right-click) a message, like Telegram or WhatsApp (P-63): the chat blurs,
 * the message lifts where it is, a glass bar of reactions springs out above it and a glass menu
 * below. The chevron opens the whole emoji board. Everything shifts up together when the menu
 * would run off the screen. Tap outside, or Android back, to close. Reduced motion: no springs.
 */
export function MessageMenu({
  anchor,
  mine,
  preview,
  reacted,
  actions,
  onReact,
  onClose,
}: {
  anchor: MessageAnchor;
  mine: boolean;
  /** A still copy of the message, drawn where it was. */
  preview: ReactNode;
  /** This person's own reactions on it (marked in the bar). */
  reacted: readonly string[];
  actions: readonly MenuAction[];
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, motion, reduceMotion, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: H, width: W } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);

  const menuH = expanded ? BOARD_H : actions.length * ROW_H + 16;
  const top = insets.top + 12;
  const bottom = H - insets.bottom - 12;
  // How far everything moves up (positive) or down (negative) to fit on the screen.
  let shift = Math.max(0, anchor.y + anchor.height + GAP + menuH - bottom);
  if (anchor.y - shift - BAR_H - GAP < top) shift = anchor.y - BAR_H - GAP - top;
  const lifted = anchor.y - shift;
  const menuTop = Math.min(lifted + anchor.height + GAP, bottom - menuH);
  const side = mine ? { right: 12 } : { left: 12 };

  const y = useSharedValue(0);
  useEffect(() => {
    y.set(reduceMotion ? -shift : withSpring(-shift, motion.spring.smooth));
  }, [shift, reduceMotion, y, motion.spring.smooth]);
  useEffect(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  const react = (emoji: string) => {
    onReact(emoji);
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={ENTER} style={styles.fill}>
        <BlurView
          intensity={28}
          tint={scheme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: 0.55 }]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        {/* The message, lifted where it was. */}
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[styles.abs, { top: anchor.y, left: anchor.x, width: anchor.width }, lift]}
        >
          {preview}
        </Animated.View>

        {/* Reactions, springing out above it. */}
        <Animated.View
          {...(reduceMotion ? {} : { entering: POP })}
          style={[styles.abs, side, { top: lifted - BAR_H - GAP }]}
        >
          <Glass radius={radii.pill} contentStyle={styles.barPad}>
            <View
              accessibilityRole="toolbar"
              accessibilityLabel="Reactions"
              style={[styles.bar, { gap: 2 }]}
            >
              {QUICK_REACTIONS.map((e) => {
                const on = reacted.includes(e);
                return (
                  <Animated.View
                    key={e}
                    {...(reduceMotion
                      ? {}
                      : {
                          entering: ENTER,
                        })}
                  >
                    <Pressable
                      onPress={() => {
                        react(e);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`React ${e}`}
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [
                        styles.reaction,
                        {
                          backgroundColor: on ? colors.accentSoft : undefined,
                          transform: [{ scale: pressed ? 1.35 : 1 }],
                        },
                      ]}
                    >
                      <AppText accessible={false} style={styles.reactionText}>
                        {e}
                      </AppText>
                    </Pressable>
                  </Animated.View>
                );
              })}
              <Pressable
                onPress={() => {
                  setExpanded((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel={expanded ? "Fewer reactions" : "More reactions"}
                accessibilityState={{ expanded }}
                style={[styles.reaction, { backgroundColor: colors.glassVeilSoft }]}
              >
                <Icon
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </Glass>
        </Animated.View>

        {expanded ? (
          <Animated.View
            {...(reduceMotion ? {} : { entering: ENTER })}
            style={[styles.abs, { top: menuTop, left: 12, right: 12, maxWidth: W - 24 }]}
          >
            <EmojiBoard onPick={react} selected={reacted} />
          </Animated.View>
        ) : (
          <Animated.View
            {...(reduceMotion ? {} : { entering: POP })}
            style={[styles.abs, side, { top: menuTop, width: MENU_W }]}
          >
            <Glass radius={radii.lg + 2} contentStyle={{ paddingVertical: spacing.xs }}>
              {actions.map((a, i) => (
                <View key={a.label}>
                  {a.destructive === true && i > 0 ? (
                    <View style={[styles.split, { backgroundColor: colors.glassHairline }]} />
                  ) : null}
                  <Pressable
                    onPress={a.onPress}
                    accessibilityRole="menuitem"
                    accessibilityLabel={a.label}
                    style={({ pressed }) => [
                      styles.item,
                      { backgroundColor: pressed ? colors.glassHighlight : undefined },
                    ]}
                  >
                    <AppText
                      variant="body"
                      color={a.destructive === true ? "danger" : "textPrimary"}
                      style={styles.flex}
                    >
                      {a.label}
                    </AppText>
                    <Icon
                      name={a.icon}
                      size={19}
                      color={a.destructive === true ? colors.danger : colors.textSecondary}
                    />
                  </Pressable>
                </View>
              ))}
            </Glass>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  abs: { position: "absolute" },
  barPad: { padding: 5 },
  bar: { flexDirection: "row", alignItems: "center" },
  reaction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionText: { fontSize: 27, lineHeight: 34 },
  split: { height: 6, opacity: 0.6, marginVertical: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_H,
    paddingHorizontal: 16,
    gap: 12,
  },
});
