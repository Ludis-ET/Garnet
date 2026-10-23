import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import type { EntryView } from "@/data/repositories/types";
import { localTimeLabel } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { EntryCard } from "./EntryCard";

export interface TimelineHandlers {
  onOpen: (entry: EntryView) => void;
  onMenu?: (entry: EntryView) => void;
  onRetry?: (entry: EntryView) => void;
}

function entering(i: number, reduceMotion: boolean) {
  return reduceMotion
    ? {}
    : {
        entering: FadeInDown.delay(Math.min(i, 8) * 50)
          .springify()
          .damping(18),
      };
}

/**
 * One person's day (DAYS-02, -03): times down the left in the viewer's zone, a thin line in the
 * author's colour with a dot per moment, the moments on the right.
 */
export function Timeline({
  entries,
  viewerZone,
  authorZone,
  color,
  onOpen,
  onMenu,
  onRetry,
}: {
  entries: readonly EntryView[];
  viewerZone: string;
  authorZone: string;
  color: string;
} & TimelineHandlers) {
  const { colors, spacing, reduceMotion } = useTheme();
  return (
    <View>
      {entries.map((e, i) => (
        <Animated.View key={e.id} {...entering(i, reduceMotion)} style={styles.row}>
          <AppText variant="footnote" color="textTertiary" style={styles.time}>
            {localTimeLabel(Temporal.Instant.from(e.at), viewerZone)}
          </AppText>
          <View style={styles.rail}>
            {entries.length < 2 ? null : (
              <View
                style={[
                  styles.line,
                  { backgroundColor: color, top: i === 0 ? 22 : 0 },
                  i === entries.length - 1 ? styles.lineEnd : styles.lineFull,
                ]}
              />
            )}
            <View
              style={[styles.dot, { borderColor: color, backgroundColor: colors.surfaceRaised }]}
            />
          </View>
          <View style={[styles.card, { paddingBottom: spacing.md }]}>
            <EntryCard
              entry={e}
              viewerZone={viewerZone}
              authorZone={authorZone}
              onPress={() => {
                onOpen(e);
              }}
              {...(onMenu === undefined || !e.editable
                ? {}
                : {
                    onMenu: () => {
                      onMenu(e);
                    },
                  })}
              {...(onRetry === undefined || e.upload !== "failed"
                ? {}
                : {
                    onRetry: () => {
                      onRetry(e);
                    },
                  })}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * The recap (DAYS-04): one merged timeline down a violet line, Ruby's moments on the left edge
 * and Sapphire's on the right, times in the viewer's zone.
 */
export function MergedTimeline({
  entries,
  viewerZone,
  zoneOf,
  isLeft,
  colorOf,
  onOpen,
}: {
  entries: readonly EntryView[];
  viewerZone: string;
  zoneOf: (e: EntryView) => string;
  isLeft: (e: EntryView) => boolean;
  colorOf: (e: EntryView) => string;
  onOpen: (entry: EntryView) => void;
}) {
  const { colors, spacing, reduceMotion } = useTheme();
  return (
    <View>
      <View style={[styles.center, { backgroundColor: colors.garnet }]} />
      {entries.map((e, i) => {
        const left = isLeft(e);
        const card = (
          <View style={[styles.half, { gap: spacing.xs }]}>
            <AppText
              variant="caption"
              color="textTertiary"
              style={left ? styles.alignRight : undefined}
            >
              {localTimeLabel(Temporal.Instant.from(e.at), viewerZone)} · {e.authorName}
            </AppText>
            <EntryCard
              entry={e}
              viewerZone={viewerZone}
              authorZone={zoneOf(e)}
              compact
              onPress={() => {
                onOpen(e);
              }}
            />
          </View>
        );
        return (
          <Animated.View
            key={e.id}
            {...entering(i, reduceMotion)}
            style={[styles.mergedRow, { paddingBottom: spacing.md }]}
          >
            {left ? card : <View style={styles.half} />}
            <View style={styles.centerRail}>
              <View
                style={[
                  styles.dot,
                  styles.centerDot,
                  { borderColor: colorOf(e), backgroundColor: colors.surfaceRaised },
                ]}
              />
            </View>
            {left ? <View style={styles.half} /> : card}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  time: { width: 44, paddingTop: 16 },
  rail: { width: 22, alignItems: "center" },
  line: { position: "absolute", width: 2, borderRadius: 1, opacity: 0.35 },
  lineFull: { bottom: 0 },
  lineEnd: { height: 22 },
  dot: {
    marginTop: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
  },
  card: { flex: 1 },
  center: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 2,
    marginLeft: -1,
    opacity: 0.35,
  },
  mergedRow: { flexDirection: "row" },
  half: { flex: 1 },
  centerRail: { width: 18, alignItems: "center" },
  centerDot: { marginTop: 22 },
  alignRight: { textAlign: "right" },
});
