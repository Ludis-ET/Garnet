import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { useTheme } from "@/theme/ThemeProvider";

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

const H = 44;
const PAD = 4;

/**
 * Liquid segmented control (P-51): a glass track with a brighter glass thumb that slides to the
 * chosen option with a spring and stretches a little as it moves. A radio group for screen
 * readers; a selection haptic on device. Under reduced motion the thumb moves without a spring.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Names the group for screen readers ("Appearance"). */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { radii, motion, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segment = width === 0 ? 0 : (width - PAD * 2) / options.length;
  const x = useSharedValue(index);
  const stretch = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      x.set(withTiming(index, { duration: 120 }));
      return;
    }
    x.set(withSpring(index, motion.spring.smooth));
    stretch.set(
      withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, motion.spring.bouncy)),
    );
  }, [index, reduceMotion, x, stretch, motion.spring.smooth, motion.spring.bouncy]);

  const thumbStyle = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: x.get() * segment }, { scaleX: stretch.get() }],
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
      }}
    >
      <Glass radius={radii.pill} shadow={false} contentStyle={[styles.track, { padding: PAD }]}>
        {width === 0 ? null : (
          <Animated.View style={[styles.thumb, { top: PAD, left: PAD }, thumbStyle]}>
            <Glass radius={radii.pill} contentStyle={styles.fill}>
              <View />
            </Glass>
          </Animated.View>
        )}
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                if (selected) return;
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                onChange(o.value);
              }}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ checked: selected, selected }}
              style={styles.option}
            >
              <AppText
                variant="callout"
                weight={selected ? "600" : "500"}
                color={selected ? "textPrimary" : "textSecondary"}
              >
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", height: H + PAD * 2 },
  thumb: { position: "absolute", height: H },
  fill: { height: H - 2 },
  option: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: H },
});
