import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import type { DemoArt, DemoMedia } from "@/data/fixtures/demoDays";
import { useTheme } from "@/theme/ThemeProvider";
import { MediaArt } from "./MediaArt";
import { ENTER } from "@/theme/transitions";
import { useTestingTools } from "@/features/prototype/devTools";

const ARTS: readonly DemoArt[] = ["sunrise", "sea", "night", "garden", "city", "coffee"];
const VIDEO_SECONDS = [12, 31, 8, 45, 19, 24];

/** Twelve sample pictures: six photos and six videos (Phase 2 never touches real media). */
const SAMPLES: readonly DemoMedia[] = [
  ...ARTS.map((art): DemoMedia => ({ type: "photo", art })),
  ...ARTS.map((art, i): DemoMedia => ({ type: "video", art, seconds: VIDEO_SECONDS[i] ?? 10 })),
];

/**
 * DAYS-07 · Add media (simulated): where from, then a sample grid. One picture per moment;
 * "Voice note" hands over to the recorder (DAYS-08). Clearly badged "Simulated".
 */
export function MediaPickerSheet({
  visible,
  onPick,
  onVoice,
  onClose,
}: {
  visible: boolean;
  onPick: (media: DemoMedia) => void;
  onVoice: () => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  // Testing tools only (P-75); the app itself looks finished.
  const tools = useTestingTools();
  const [step, setStep] = useState<"source" | "grid">("source");
  const [chosen, setChosen] = useState<number | null>(null);
  const close = () => {
    setStep("source");
    setChosen(null);
    onClose();
  };
  const picked = chosen === null ? undefined : SAMPLES[chosen];
  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={step === "source" ? "Add to this moment" : "Library"}
      {...(step === "grid"
        ? {
            footer: (
              <Button
                label={picked?.type === "video" ? "Add video" : "Add photo"}
                disabled={picked === undefined}
                onPress={() => {
                  if (picked === undefined) return;
                  onPick(picked);
                  setStep("source");
                  setChosen(null);
                }}
              />
            ),
          }
        : {})}
    >
      <View style={styles.center}>{tools ? <SimulatedBadge text="Simulated picker" /> : null}</View>
      {step === "source" ? (
        <Animated.View entering={ENTER} style={{ gap: spacing.xxs }}>
          <SheetAction
            icon="image"
            label="Photo library"
            onPress={() => {
              setStep("grid");
            }}
          />
          <SheetAction
            icon="sparkle"
            label="Take photo"
            onPress={() => {
              setStep("grid");
            }}
          />
          <SheetAction
            icon="video"
            label="Record video"
            onPress={() => {
              setStep("grid");
            }}
          />
          <SheetAction icon="mic" label="Voice note" onPress={onVoice} />
        </Animated.View>
      ) : (
        <Animated.View entering={ENTER} style={[styles.grid, { gap: spacing.sm }]}>
          {SAMPLES.map((m, i) => {
            const on = chosen === i;
            if (m.type === "voice") return null;
            return (
              <Pressable
                key={`${m.type}-${m.art}`}
                onPress={() => {
                  setChosen(on ? null : i);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${m.type === "video" ? "Video" : "Photo"} ${i + 1}`}
                style={[
                  styles.cell,
                  {
                    borderRadius: radii.md,
                    borderColor: on ? colors.accent : "transparent",
                    transform: [{ scale: on ? 0.94 : 1 }],
                  },
                ]}
              >
                <MediaArt
                  art={m.art}
                  {...(m.type === "video" ? { seconds: m.seconds } : {})}
                  height={96}
                  radius={radii.md - 2}
                />
                {on ? (
                  <Animated.View
                    entering={ENTER}
                    style={[styles.check, { backgroundColor: colors.accent }]}
                  >
                    <Icon name="check" size={13} color={colors.onAccent} />
                  </Animated.View>
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      )}
      {step === "grid" ? (
        <AppText variant="caption" color="textTertiary" style={styles.centerText}>
          Sample pictures only
        </AppText>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  centerText: { textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cell: { width: "31.5%", borderWidth: 2.5, overflow: "hidden" },
  check: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
