import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { ACTIVITIES, FEELINGS, type ActivityId, type FeelingId } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

/** One soft labelled emoji tile; chosen shows fill, rim and a check (never colour alone). */
function Tile({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRadius: radii.lg,
          backgroundColor: selected ? colors.accentSoft : colors.glassVeilSoft,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <AppText variant="title" accessible={false}>
        {emoji}
      </AppText>
      <AppText
        variant="caption"
        weight={selected ? "600" : "500"}
        color={selected ? "textPrimary" : "textSecondary"}
      >
        {label}
      </AppText>
      {selected ? (
        <Animated.View entering={ENTER} style={[styles.check, { backgroundColor: colors.accent }]}>
          <Icon name="check" size={11} color={colors.onAccent} />
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

/** DAYS-09 · Feeling and activity: two tabs of soft emoji tiles, then Clear or Done. */
export function FeelingSheet({
  visible,
  mood,
  activity,
  onDone,
  onClose,
}: {
  visible: boolean;
  mood: FeelingId | null;
  activity: ActivityId | null;
  onDone: (picked: { mood: FeelingId | null; activity: ActivityId | null }) => void;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<"feeling" | "activity">("feeling");
  const [m, setM] = useState(mood);
  const [a, setA] = useState(activity);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      peek={<SideCharacter pose="happy" size={104} />}
      footer={
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={styles.flex}>
            <Button
              label="Clear"
              variant="secondary"
              onPress={() => {
                setM(null);
                setA(null);
              }}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Done"
              onPress={() => {
                onDone({ mood: m, activity: a });
              }}
            />
          </View>
        </View>
      }
    >
      <Segmented
        label="Pick"
        options={[
          { label: "Feeling", value: "feeling" },
          { label: "Activity", value: "activity" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View accessibilityRole="radiogroup" style={[styles.grid, { gap: spacing.sm }]}>
        {tab === "feeling"
          ? FEELINGS.map((f) => (
              <Tile
                key={f.id}
                emoji={f.emoji}
                label={f.label}
                selected={m === f.id}
                onPress={() => {
                  setM(m === f.id ? null : f.id);
                }}
              />
            ))
          : ACTIVITIES.map((x) => (
              <Tile
                key={x.id}
                emoji={x.emoji}
                label={x.label}
                selected={a === x.id}
                onPress={() => {
                  setA(a === x.id ? null : x.id);
                }}
              />
            ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "23%", aspectRatio: 0.9, alignItems: "center", justifyContent: "center", gap: 4 },
  check: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
