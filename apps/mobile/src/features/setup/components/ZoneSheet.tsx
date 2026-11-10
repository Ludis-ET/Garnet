import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { localTimeLabel, offsetLabel, searchZones } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, SHEET } from "@/theme/transitions";

/**
 * SETUP-05 "Change" sheet: search cities by name, country or zone; each row shows the city's
 * current offset and time from the zone database (ADR-0002). Selecting closes the sheet.
 */
export function ZoneSheet({
  visible,
  selected,
  now,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string | null;
  now: Temporal.Instant;
  onSelect: (zone: string) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const results = searchZones(query);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View entering={ENTER} style={[styles.fill, { backgroundColor: colors.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <Animated.View
          {...(reduceMotion ? {} : { entering: SHEET })}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingTop: insets.top + spacing.xxl }]}
        >
          <Glass
            radius={radii.xl}
            fill
            style={styles.flex}
            contentStyle={[
              styles.flex,
              { padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <View style={[styles.row, { gap: spacing.md }]}>
              <AppText variant="headline" style={styles.flex}>
                Choose your city
              </AppText>
              <IconButton icon="x" label="Close" onPress={onClose} />
            </View>
            <TextField
              label="Search cities"
              placeholder="City or country"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            <FlatList
              data={results}
              keyExtractor={(z) => z.zone}
              keyboardShouldPersistTaps="handled"
              style={styles.flex}
              ListEmptyComponent={
                <AppText
                  variant="callout"
                  color="textSecondary"
                  style={{ paddingVertical: spacing.lg }}
                >
                  No matching city. Try a country or a bigger city nearby.
                </AppText>
              }
              ItemSeparatorComponent={() => (
                <View style={[styles.divider, { backgroundColor: colors.glassHairline }]} />
              )}
              renderItem={({ item }) => {
                const isSelected = item.zone === selected;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item.zone);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${item.city}, ${item.country}, ${offsetLabel(item.zone, now)}`}
                    style={({ pressed }) => [
                      styles.item,
                      { gap: spacing.md, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View style={styles.flex}>
                      <AppText variant="body" weight={isSelected ? "600" : "400"}>
                        {item.city}
                      </AppText>
                      <AppText variant="footnote" color="textSecondary">
                        {item.country} · {offsetLabel(item.zone, now)}
                      </AppText>
                    </View>
                    <AppText variant="callout" color="textSecondary">
                      {localTimeLabel(now, item.zone)}
                    </AppText>
                    <View style={styles.check}>
                      {isSelected ? <Icon name="check" size={20} color={colors.accent} /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          </Glass>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  sheet: { flex: 1, paddingHorizontal: 8, width: "100%", maxWidth: 480, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  item: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  divider: { height: StyleSheet.hairlineWidth },
  check: { width: 24, alignItems: "center" },
});
