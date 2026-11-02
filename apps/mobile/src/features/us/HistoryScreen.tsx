/**
 * US-10 · Signals between you, newest first, grouped by day in the viewer's zone. Lines and
 * replies only: no totals, charts or "seen" (§5). How long signals are kept is open (U-09), and
 * the privacy sheet says so.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import type { SignalItem } from "@/data/repositories/types";
import { historyDayLabel } from "@/domain/us";
import { useNow } from "@/features/setup/useNow";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { SignalRow } from "./components/UsParts";
import { useSignalHistory, useUsOverview } from "./useUs";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

function HistoryContent() {
  const { colors, spacing, reduceMotion } = useTheme();
  const now = useNow();
  const history = useSignalHistory();
  const overview = useUsOverview();
  const [open, setOpen] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const items = history.data;
  const people = overview.data;

  const back = () => {
    goBack("/us");
  };
  if (items === undefined || people === undefined)
    return (
      <GlassScreen tabBar onBack={back}>
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );

  const { me, partner } = people;
  const today = now.toZonedDateTimeISO(me.zone).toPlainDate();
  const groups: { label: string; items: SignalItem[] }[] = [];
  for (const item of items) {
    const day = Temporal.Instant.from(item.at).toZonedDateTimeISO(me.zone).toPlainDate();
    const label = historyDayLabel(day, today);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <>
      <GlassScreen
        tabBar
        onBack={back}
        header={
          <AppText variant="headline" style={styles.textCenter}>
            Between you
          </AppText>
        }
      >
        {groups.length === 0 ? (
          <View style={[styles.grow, styles.center, { gap: spacing.md }]}>
            <SideCharacter pose="together" size={180} shared />
            <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
              Little signals between you will appear here.
            </AppText>
          </View>
        ) : (
          groups.map((g) => (
            <Animated.View
              key={g.label}
              {...(reduceMotion
                ? {}
                : {
                    entering: ENTER,
                  })}
              style={{ gap: spacing.sm }}
            >
              <AppText variant="footnote" color="textSecondary" weight="600">
                {g.label}
              </AppText>
              {g.items.map((item) => (
                <SignalRow
                  key={item.id}
                  item={item}
                  me={me}
                  partner={partner}
                  expanded={open === item.id}
                  onToggle={() => {
                    setOpen(open === item.id ? null : item.id);
                  }}
                />
              ))}
            </Animated.View>
          ))
        )}
        <Pressable
          onPress={() => {
            setAbout(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Only the two of you can see this. Learn more"
          style={[styles.row, styles.centerRow, { gap: spacing.xs }]}
        >
          <Icon name="lock" size={14} color={colors.textTertiary} />
          <AppText variant="footnote" color="textTertiary">
            Only the two of you can see this.
          </AppText>
        </Pressable>
      </GlassScreen>
      <Sheet
        visible={about}
        title="Who sees what"
        peek={<SideCharacter pose="listening" size={104} shared />}
        onClose={() => {
          setAbout(false);
        }}
        footer={
          <Button
            label="Got it"
            variant="secondary"
            onPress={() => {
              setAbout(false);
            }}
          />
        }
      >
        <AppText variant="callout">
          {`${me.name} and ${partner.name} see every signal between you. Nobody else does.`}
        </AppText>
        <AppText variant="callout" color="textSecondary">
          No counts, no scores, no "seen".
        </AppText>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <Icon name="info" size={16} color={colors.textSecondary} />
          <AppText variant="footnote" color="textSecondary" style={styles.flex}>
            How long signals are kept hasn't been decided yet.
          </AppText>
        </View>
      </Sheet>
    </>
  );
}

export function HistoryScreen() {
  return (
    <SideScope side="garnet">
      <View style={styles.fill}>
        <HistoryContent />
      </View>
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Inside GlassScreen's scroll content: grow, never `flex: 1` (rule 11).
  grow: { flexGrow: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  centerRow: { justifyContent: "center" },
  textCenter: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
