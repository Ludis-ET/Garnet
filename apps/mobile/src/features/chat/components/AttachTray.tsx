import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import type { DemoArt, DemoMedia } from "@/data/fixtures/demoDays";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";
import { useTestingTools } from "@/features/prototype/devTools";

const ARTS: readonly DemoArt[] = ["sunrise", "sea", "night", "garden", "city", "coffee"];
const SECONDS = [14, 31, 9, 42, 18, 25];

/** Recent sample pictures, newest first: a mix of photos and videos (no real media, Phase 2). */
const RECENT: readonly Exclude<DemoMedia, { type: "voice" }>[] = ARTS.flatMap((art, i) => [
  { type: "photo" as const, art },
  { type: "video" as const, art: ARTS[(i + 2) % ARTS.length] ?? art, seconds: SECONDS[i] ?? 12 },
]);

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.flex, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
    >
      <Glass radius={radii.lg} contentStyle={[styles.tile, { gap: spacing.xs }]}>
        <View style={[styles.tileIcon, { backgroundColor: colors.accentSoft }]}>
          <Icon name={icon} size={22} color={colors.accent} />
        </View>
        <AppText variant="caption" weight="600">
          {label}
        </AppText>
      </Glass>
    </Pressable>
  );
}

/**
 * The attachment tray (CHAT-08, redesign P-61): recent pictures in a strip you can scroll and
 * tap (like a phone's photo shelf), then Camera, Video and Voice. Simulated, and badged so.
 */
export function AttachTray({
  onPick,
  onVoice,
  onClose,
}: {
  onPick: (media: Exclude<DemoMedia, { type: "voice" }>) => void;
  onVoice: () => void;
  onClose: () => void;
}) {
  const { radii, spacing, reduceMotion } = useTheme();
  // Testing tools only (P-75); the app itself looks finished.
  const tools = useTestingTools();
  return (
    <Sheet visible onClose={onClose}>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="headline" style={styles.flex}>
          Recent
        </AppText>
        {tools ? <SimulatedBadge text="Sample pictures" /> : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {RECENT.map((m, i) => (
          <Animated.View
            key={`${m.type}-${m.art}-${String(i)}`}
            {...(reduceMotion
              ? {}
              : {
                  entering: ENTER,
                })}
          >
            <Pressable
              onPress={() => {
                onPick(m);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${m.type === "video" ? "Video" : "Photo"} ${String(i + 1)}`}
              style={({ pressed }) => [
                styles.thumb,
                { borderRadius: radii.md, transform: [{ scale: pressed ? 0.94 : 1 }] },
              ]}
            >
              <MediaArt
                art={m.art}
                {...(m.type === "video" ? { seconds: m.seconds } : {})}
                height={132}
                radius={radii.md}
              />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Tile
          icon="camera"
          label="Camera"
          onPress={() => {
            const first = RECENT[0];
            if (first !== undefined) onPick(first);
          }}
        />
        <Tile
          icon="video"
          label="Video"
          onPress={() => {
            const video = RECENT.find((m) => m.type === "video");
            if (video !== undefined) onPick(video);
          }}
        />
        <Tile icon="mic" label="Voice" onPress={onVoice} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: { width: 100, overflow: "hidden" },
  tile: { height: 92, alignItems: "center", justifyContent: "center" },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
