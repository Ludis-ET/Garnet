/** SETUP-02 · Your name (P-52 limits, proposed). The preview is in-app only (P-17). */
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { TextField } from "@/components/ui/TextField";
import { greetingPreview, NAME_POLICY_P52 } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";

export function NameStep({
  partnerName,
  displayName,
  nickname,
  nameError,
  nicknameError,
  onDisplayName,
  onNickname,
  onSubmit,
}: {
  partnerName: string;
  displayName: string;
  nickname: string;
  nameError: string | undefined;
  nicknameError: string | undefined;
  onDisplayName: (v: string) => void;
  onNickname: (v: string) => void;
  onSubmit: () => void;
}) {
  const { radii, spacing, reduceMotion } = useTheme();
  const preview = greetingPreview(displayName || "you", nickname);
  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Display name"
        large
        value={displayName}
        onChangeText={onDisplayName}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={NAME_POLICY_P52.maxDisplayName + 10}
        {...(nameError === undefined ? {} : { error: nameError })}
      />
      <TextField
        label="Nickname (optional)"
        helper={`Only ${partnerName} sees this.`}
        value={nickname}
        onChangeText={onNickname}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        maxLength={NAME_POLICY_P52.maxNickname + 10}
        {...(nicknameError === undefined ? {} : { error: nicknameError })}
      />
      <View style={{ gap: spacing.xs }}>
        <Glass
          radius={radii.lg + 4}
          contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
        >
          <View style={styles.icon}>
            <GarnetMark size={34} animated={false} />
          </View>
          <View style={styles.flex}>
            <AppText variant="caption" color="textTertiary">
              {partnerName}'s Garnet
            </AppText>
            <Animated.View
              key={preview}
              {...(reduceMotion ? {} : { entering: FadeIn.duration(220) })}
            >
              <AppText variant="callout" weight="500">
                {preview}
              </AppText>
            </Animated.View>
          </View>
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  icon: { width: 36, alignItems: "center" },
});
