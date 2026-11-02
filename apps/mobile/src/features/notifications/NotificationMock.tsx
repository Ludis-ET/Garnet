import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { AppText } from "@/components/ui/AppText";
import { DarkGlass } from "@/components/ui/DarkGlass";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

export type DeviceFrame = "ios-lock" | "ios-banner" | "android-heads-up" | "android-shade";

export const DEVICE_FRAMES: readonly { value: DeviceFrame; label: string }[] = [
  { value: "ios-lock", label: "iOS lock" },
  { value: "ios-banner", label: "iOS banner" },
  { value: "android-heads-up", label: "Android" },
  { value: "android-shade", label: "Shade" },
];

/**
 * A drawn notification for previews (SET-05, SET-07, NOTIF-02): how one would look on a lock
 * screen, as a banner, or on Android. A picture only; nothing is ever sent in Phase 2.
 */
export function NotificationMock({
  frame,
  title,
  body,
  time = "now",
}: {
  frame: DeviceFrame;
  title: string;
  body: string;
  time?: string;
}) {
  const { radii, reduceMotion } = useTheme();
  const android = frame === "android-heads-up" || frame === "android-shade";
  const card = (
    <Animated.View key={`${frame}-${title}-${body}`} {...(reduceMotion ? {} : { entering: ENTER })}>
      {android ? (
        <View style={[styles.android, frame === "android-shade" ? styles.shade : null]}>
          <View style={styles.androidHead}>
            <GarnetMark size={16} animated={false} />
            <AppText variant="caption" style={styles.androidMeta}>
              Garnet · {time}
            </AppText>
          </View>
          <AppText variant="callout" weight="600" style={styles.ink} numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="footnote" style={styles.inkSoft} numberOfLines={2}>
            {body}
          </AppText>
        </View>
      ) : (
        <DarkGlass radius={22} contentStyle={styles.ios}>
          <GarnetMark size={34} animated={false} />
          <View style={styles.flex}>
            <View style={styles.row}>
              <AppText variant="callout" weight="600" style={styles.white} numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="caption" style={styles.whiteSoft}>
                {time}
              </AppText>
            </View>
            <AppText variant="footnote" style={styles.white} numberOfLines={2}>
              {body}
            </AppText>
          </View>
        </DarkGlass>
      )}
    </Animated.View>
  );
  return (
    <View
      accessible
      accessibilityLabel={`Preview: ${title}. ${body}`}
      style={[styles.frame, { borderRadius: radii.xl }]}
    >
      <LinearGradient
        colors={
          android
            ? ["#E9E6F2", "#D9D3EA"]
            : frame === "ios-lock"
              ? ["#2B1A4A", "#5A2A6E", "#1B2D6B"]
              : ["#F6F3FB", "#E6E0F5"]
        }
        style={StyleSheet.absoluteFill}
      />
      {frame === "ios-lock" ? (
        <View style={styles.clock}>
          <AppText variant="footnote" style={styles.whiteSoft}>
            Tuesday 5 January
          </AppText>
          <AppText style={styles.time}>9:41</AppText>
        </View>
      ) : null}
      <View style={styles.cardWrap}>{card}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  frame: { overflow: "hidden", minHeight: 150, justifyContent: "flex-end" },
  clock: { alignItems: "center", paddingTop: 14 },
  time: { color: "#FFFFFF", fontSize: 54, lineHeight: 60, fontWeight: "200" },
  cardWrap: { padding: 12 },
  ios: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  white: { color: "#FFFFFF" },
  whiteSoft: { color: "rgba(255,255,255,0.78)" },
  android: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 2,
    shadowColor: "#2B1240",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  shade: { borderRadius: 12, shadowOpacity: 0 },
  androidHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  androidMeta: { color: "#5B5670" },
  ink: { color: "#15131C" },
  inkSoft: { color: "#4A4558" },
});
