import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { HomePerson } from "@/data/repositories/types";
import { MediaArt } from "@/features/days/components/MediaArt";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { demoPhotoArt } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, POP } from "@/theme/transitions";

/**
 * Preview before sending (CHAT-08, redesign P-61): the picture full-screen over a dark wash of
 * its own colours, a caption field floating at the bottom and one send button addressed to the
 * partner. Nothing becomes a memory unless saved later. Close returns to the chat with nothing
 * sent.
 */
export function MediaComposer({
  media,
  partner,
  sending,
  onSend,
  onClose,
}: {
  media: Exclude<DemoMedia, { type: "voice" }>;
  partner: HomePerson;
  sending: boolean;
  onSend: (caption: string) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const [caption, setCaption] = useState("");
  const w = Math.min(width - spacing.lg * 2, 440);
  const h = Math.min(height * 0.58, media.type === "video" ? w * 0.75 : w * 1.25);
  const art = demoPhotoArt[media.art];
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={ENTER} style={styles.fill}>
        <LinearGradient
          colors={[art.colors[2], "#07060C", "#07060C"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.fill} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.fill}
          >
            <View style={[styles.row, { padding: spacing.md, gap: spacing.sm }]}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Glass radius={22} contentStyle={styles.round}>
                  <Icon name="x" size={20} color={colors.textPrimary} />
                </Glass>
              </Pressable>
              <View style={styles.flex} />
              <Glass
                radius={radii.pill}
                contentStyle={[styles.row, styles.to, { gap: spacing.xs }]}
              >
                <ProfileAvatar
                  name={partner.name}
                  avatar={partner.avatar ?? { kind: "initials", swatch: 1 }}
                  side={partner.side}
                  size={26}
                />
                <AppText variant="footnote" weight="600">
                  To {partner.name}
                </AppText>
              </Glass>
            </View>
            <View style={[styles.flex, styles.center]}>
              <Animated.View
                {...(reduceMotion ? {} : { entering: POP })}
                style={[styles.frame, { width: w, borderRadius: radii.xl + 6 }]}
              >
                <MediaArt
                  art={media.art}
                  {...(media.type === "video" ? { seconds: media.seconds } : {})}
                  height={h}
                  radius={radii.xl + 6}
                />
              </Animated.View>
            </View>
            <View style={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <Glass radius={26} style={styles.flex} contentStyle={styles.captionBox}>
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Add a caption…"
                    placeholderTextColor={colors.textTertiary}
                    accessibilityLabel="Caption"
                    maxLength={200}
                    style={[styles.input, { color: colors.textPrimary }]}
                  />
                </Glass>
                <Pressable
                  onPress={() => {
                    onSend(caption.trim());
                  }}
                  disabled={sending}
                  accessibilityRole="button"
                  accessibilityLabel={`Send to ${partner.name}`}
                  style={({ pressed }) => ({
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: sending ? 0.6 : 1,
                  })}
                >
                  <LinearGradient
                    colors={[colors.accentStrong, colors.accentStrongEnd]}
                    style={styles.send}
                  >
                    <Icon name="send" size={22} color={colors.onAccent} />
                  </LinearGradient>
                </Pressable>
              </View>
              <AppText variant="caption" style={styles.note}>
                Only {partner.name} gets this. It won't become a memory unless you save it.
              </AppText>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  round: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  to: { paddingLeft: 4, paddingRight: 12, paddingVertical: 4 },
  frame: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
  captionBox: { minHeight: 52, justifyContent: "center", paddingHorizontal: 16 },
  input: { fontSize: 17, paddingVertical: 10 },
  send: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  note: { color: "rgba(255,255,255,0.7)", textAlign: "center" },
});
