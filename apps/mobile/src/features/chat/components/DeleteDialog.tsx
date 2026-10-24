import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

export type DeleteMode = "for-me" | "for-everyone";

export function DeleteDialog({
  visible,
  partnerName,
  canDeleteForEveryone,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  partnerName: string;
  canDeleteForEveryone: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteMode) => void;
}) {
  const { radii, spacing, reduceMotion } = useTheme();
  const [targetMode, setTargetMode] = useState<DeleteMode | null>(
    canDeleteForEveryone ? null : "for-me",
  );
  const [prevVisible, setPrevVisible] = useState(visible);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setTargetMode(canDeleteForEveryone ? null : "for-me");
    }
  }

  if (!visible) return null;

  const handleClose = () => {
    setTargetMode(canDeleteForEveryone ? null : "for-me");
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss delete dialog"
      >
        <Animated.View
          entering={
            reduceMotion ? FadeIn.duration(120) : ZoomIn.springify().damping(16).stiffness(240)
          }
          exiting={reduceMotion ? FadeOut.duration(100) : ZoomOut.duration(140)}
          style={[styles.box, { paddingHorizontal: spacing.gutter }]}
        >
          <Glass radius={radii.xl} shadow contentStyle={{ padding: spacing.xl, gap: spacing.md }}>
            {targetMode === "for-me" ? (
              <>
                <AppText variant="headline" weight="600" style={styles.title}>
                  Delete for you?
                </AppText>
                <AppText variant="callout" color="textSecondary" style={styles.body}>
                  This removes the message from your view only.
                </AppText>
                <View style={[styles.buttonRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
                  <View style={styles.btnFlex}>
                    <Button label="Cancel" variant="text" onPress={handleClose} />
                  </View>
                  <View style={styles.btnFlex}>
                    <Button
                      label="Delete for me"
                      variant="primary"
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onConfirm("for-me");
                        handleClose();
                      }}
                    />
                  </View>
                </View>
              </>
            ) : targetMode === "for-everyone" ? (
              <>
                <AppText variant="headline" weight="600" style={styles.title}>
                  Delete for everyone?
                </AppText>
                <AppText variant="callout" color="textSecondary" style={styles.body}>
                  This removes it for you and {partnerName}. It can't remove screenshots or copies
                  outside Garnet.
                </AppText>
                <View style={[styles.buttonRow, { gap: spacing.sm, marginTop: spacing.sm }]}>
                  <View style={styles.btnFlex}>
                    <Button label="Cancel" variant="text" onPress={handleClose} />
                  </View>
                  <View style={styles.btnFlex}>
                    <Button
                      label="Delete for everyone"
                      variant="destructive"
                      onPress={() => {
                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        onConfirm("for-everyone");
                        handleClose();
                      }}
                    />
                  </View>
                </View>
              </>
            ) : (
              // Choice menu when user is author (can delete for everyone or for me)
              <>
                <AppText variant="headline" weight="600" style={styles.title}>
                  Delete message
                </AppText>
                <AppText variant="callout" color="textSecondary" style={styles.body}>
                  Choose how you'd like to delete this message.
                </AppText>
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  <Button
                    label="Delete for me"
                    variant="text"
                    onPress={() => {
                      setTargetMode("for-me");
                    }}
                  />
                  <Button
                    label="Delete for everyone"
                    variant="destructive"
                    onPress={() => {
                      setTargetMode("for-everyone");
                    }}
                  />
                  <Button label="Cancel" variant="text" onPress={handleClose} />
                </View>
              </>
            )}
          </Glass>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 4, 9, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "100%",
    maxWidth: 340,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  btnFlex: {
    flex: 1,
  },
});
