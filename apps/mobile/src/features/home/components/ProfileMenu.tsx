import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { AvatarChoice } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";

/** HOME-05: a glass popover from the avatar — you, Settings, Sign out. Nothing else. */
export function ProfileMenu({
  visible,
  name,
  side,
  avatar,
  onSettings,
  onSignOut,
  onClose,
}: {
  visible: boolean;
  name: string;
  side: GemSide | null;
  avatar: AvatarChoice;
  onSettings: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const row = (icon: IconName, label: string, onPress: () => void, danger = false) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { gap: spacing.md, paddingHorizontal: spacing.lg, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} size={20} color={danger ? colors.danger : colors.textSecondary} />
      <AppText variant="body" color={danger ? "danger" : "textPrimary"}>
        {label}
      </AppText>
    </Pressable>
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[styles.fill, { backgroundColor: colors.scrim }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
        <Animated.View
          {...(reduceMotion ? {} : { entering: ZoomIn.springify().damping(17).stiffness(260) })}
          accessibilityRole="menu"
          accessibilityViewIsModal
          style={[styles.menu, { top: insets.top + 64, right: spacing.gutter }]}
        >
          <Glass radius={radii.xl}>
            <View style={[styles.row, styles.me, { gap: spacing.md, padding: spacing.lg }]}>
              <ProfileAvatar name={name} avatar={avatar} side={side} size={48} />
              <View>
                <AppText variant="body" weight="600">
                  {name}
                </AppText>
                <AppText variant="footnote" color="textSecondary">
                  {side === "ruby" ? "❤️ Ruby" : side === "sapphire" ? "💙 Sapphire" : "Garnet"}
                </AppText>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.glassHairline }]} />
            {row("settings", "Settings", onSettings)}
            <View style={[styles.divider, { backgroundColor: colors.glassHairline }]} />
            {row("sign-out", "Sign out", onSignOut, true)}
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  menu: { position: "absolute", width: 260 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  me: { minHeight: 80 },
  divider: { height: StyleSheet.hairlineWidth },
});
