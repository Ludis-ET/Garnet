import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";

const SIZE = 44;

/**
 * A round glass button (Back, close, account). 44 pt visible, 48 pt with its hit slop; squishes
 * slightly on press (P-48).
 */
export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors, motion, reduceMotion } = useTheme();
  const pressed = useSharedValue(0);
  const set = (to: number) => {
    pressed.set(
      reduceMotion ? withTiming(to, { duration: 80 }) : withSpring(to, motion.spring.press),
    );
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.08 }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        set(1);
      }}
      onPressOut={() => {
        set(0);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
    >
      <Animated.View style={style}>
        <Glass
          radius={SIZE / 2}
          contentStyle={{
            width: SIZE,
            height: SIZE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={22} color={colors.textPrimary} />
        </Glass>
      </Animated.View>
    </Pressable>
  );
}
