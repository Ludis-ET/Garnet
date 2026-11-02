import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SignalId } from "@garnet/domain";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";
import { MORE_SIGNALS, signalLabel } from "../signals";
import { SignalButton } from "./SignalButton";
import { ENTER, SHEET } from "@/theme/transitions";

/** HOME-04 "More": the other five signals, each hold-to-send, in a glass sheet. */
export function MoreSheet({
  visible,
  partnerName,
  onSend,
  onClose,
}: {
  visible: boolean;
  partnerName: string;
  onSend: (id: SignalId) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View entering={ENTER} style={[styles.fill, { backgroundColor: colors.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          {...(reduceMotion ? {} : { entering: SHEET })}
          accessibilityViewIsModal
          style={[styles.sheet, { padding: spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}
        >
          <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xl, gap: spacing.lg }}>
            <View style={[styles.grabber, { backgroundColor: colors.glassRimEnd }]} />
            <AppText variant="headline" style={styles.center}>
              Hold to send
            </AppText>
            <View style={[styles.grid, { rowGap: spacing.lg }]}>
              {MORE_SIGNALS.map((s) => (
                <SignalButton
                  key={s.id}
                  emoji={s.emoji}
                  word={s.word}
                  label={signalLabel(s.id)}
                  partnerName={partnerName}
                  onSend={() => {
                    onSend(s.id);
                  }}
                />
              ))}
            </View>
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 480, alignSelf: "center" },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center" },
  center: { textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-evenly" },
});
