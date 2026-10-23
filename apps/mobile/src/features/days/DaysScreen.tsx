/**
 * DAYS-01 · Days (Daylight Glass liquid, minimal; P-53). A page for both partners, so it renders
 * in Garnet violet with Ruby and Sapphire as the two dots. Rows show only what the viewer may
 * see: a partner's private drafts never add a dot, an emoji or a hit (§4); no counts (§5).
 * DAYS-10 explains the PROVISIONAL day boundary (U-02); DAYS-11 searches.
 */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import type { DaySummary, EntryView } from "@/data/repositories/types";
import {
  dayLabel,
  ENTRY_KINDS,
  type EntryFilter,
  type RevealState,
  weekLabel,
} from "@/domain/days";
import { localTimeLabel } from "@/domain/identity";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ADD_BUTTON_SPACE, AddButton } from "./components/AddButton";
import { BoundarySheet } from "./components/BoundarySheet";
import { FilterSheet } from "./components/FilterSheet";
import { MediaArt } from "./components/MediaArt";
import { MonthCalendar } from "./components/MonthCalendar";
import { useDaysOverview, useSearch } from "./useDays";

const STATUS: Record<RevealState, { icon: IconName; label: (today: boolean) => string }> = {
  ready: { icon: "sparkle", label: () => "Revealed" },
  waiting: { icon: "moon", label: () => "Waiting to meet" },
  open: { icon: "clock", label: (today) => (today ? "So far" : "Still yours") },
};

export function openDay(date: string) {
  router.push({ pathname: "/days/[date]", params: { date } });
}

function DayRow({
  day,
  meName,
  partnerName,
  meColor,
  partnerColor,
  index,
}: {
  day: DaySummary;
  meName: string;
  partnerName: string;
  meColor: string;
  partnerColor: string;
  index: number;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const date = Temporal.PlainDate.from(day.date);
  const [weekday] = dayLabel(date).split(" ");
  const status = STATUS[day.state];
  const who = [day.me ? meName : null, day.partner ? partnerName : null].filter((x) => x !== null);
  return (
    <Animated.View
      {...(reduceMotion
        ? {}
        : {
            entering: FadeInDown.delay(Math.min(index, 8) * 45)
              .springify()
              .damping(18),
          })}
    >
      <Pressable
        onPress={() => {
          openDay(day.date);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${day.isToday ? "Today" : dayLabel(date)}. ${status.label(day.isToday)}.${who.length > 0 ? ` Moments from ${who.join(" and ")}.` : ""}`}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Glass
          radius={radii.xl}
          tint={day.isToday ? "garnet" : "none"}
          shadow={day.isToday}
          contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
        >
          <View style={styles.date}>
            <AppText
              variant="caption"
              color={day.isToday ? "accent" : "textSecondary"}
              weight="600"
            >
              {day.isToday ? "Today" : weekday}
            </AppText>
            <AppText variant="title" serif>
              {date.day}
            </AppText>
          </View>
          <View style={[styles.flex, { gap: spacing.xs }]}>
            <AppText variant="headline" accessible={false} numberOfLines={1}>
              {day.preview.length === 0 ? "·" : day.preview.join("  ")}
            </AppText>
            <View style={[styles.row, { gap: spacing.xs }]}>
              <Icon name={status.icon} size={13} color={colors.textSecondary} />
              <AppText variant="caption" color="textSecondary">
                {status.label(day.isToday)}
              </AppText>
            </View>
          </View>
          {day.thumb === null ? null : (
            <View style={styles.thumb}>
              <MediaArt art={day.thumb} height={52} radius={14} />
            </View>
          )}
          <View style={{ gap: 4 }}>
            <Initial on={day.me} name={meName} color={meColor} />
            <Initial on={day.partner} name={partnerName} color={partnerColor} />
          </View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/** Who logged: a tiny ring with their initial (never colour alone); nothing when they didn't. */
function Initial({ on, name, color }: { on: boolean; name: string; color: string }) {
  const { colors } = useTheme();
  if (!on) return <View style={styles.initialSpace} />;
  return (
    <View style={[styles.initial, { borderColor: color, backgroundColor: colors.glassVeil }]}>
      <AppText variant="caption" weight="600">
        {Array.from(name)[0] ?? ""}
      </AppText>
    </View>
  );
}

/** The matched words, gently bolded (DAYS-11). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q.length === 0 ? -1 : text.toLowerCase().indexOf(q);
  if (at < 0)
    return (
      <AppText variant="callout" numberOfLines={2} style={styles.flex}>
        {text}
      </AppText>
    );
  return (
    <AppText variant="callout" numberOfLines={2} style={styles.flex}>
      {text.slice(0, at)}
      <AppText variant="callout" weight="600" color="accent" inline>
        {text.slice(at, at + q.length)}
      </AppText>
      {text.slice(at + q.length)}
    </AppText>
  );
}

function filterSummary(f: EntryFilter, partnerName: string): string {
  const parts: string[] = [];
  if (f.query.length > 0) parts.push(`“${f.query}”`);
  for (const k of f.kinds) parts.push(ENTRY_KINDS.find((x) => x.kind === k)?.label ?? k);
  if (f.who === "me") parts.push("Mine");
  if (f.who === "partner") parts.push(partnerName);
  return parts.join(" · ");
}

function Skeleton() {
  const { radii, reduceMotion } = useTheme();
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    if (!reduceMotion) pulse.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [pulse, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View style={[{ gap: 12 }, style]} accessibilityLabel="Loading">
      {[0, 1, 2].map((i) => (
        <Glass key={i} radius={radii.xl} shadow={false} contentStyle={styles.skeleton}>
          <View />
        </Glass>
      ))}
    </Animated.View>
  );
}

function DaysContent() {
  const { colors, radii, spacing } = useTheme();
  const overview = useDaysOverview();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<EntryFilter | null>(null);
  const [sheet, setSheet] = useState<"filter" | "boundary" | null>(null);
  const results = useSearch(filter);
  const data = overview.data;
  const me = data?.me;
  const partner = data?.partner;
  const meColor = sideColor(me?.side ?? null);
  const partnerColor = sideColor(partner?.side ?? null);

  const weeks: { label: string; days: DaySummary[] }[] = [];
  if (data !== undefined) {
    const today = Temporal.PlainDate.from(data.today);
    for (const d of data.days) {
      const label = weekLabel(Temporal.PlainDate.from(d.date), today);
      const last = weeks.at(-1);
      if (last?.label === label) last.days.push(d);
      else weeks.push({ label, days: [d] });
    }
  }
  const empty = data?.days.every((d) => !d.me && !d.partner) === true;

  return (
    <View style={styles.fill}>
      <GlassScreen tabBar>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <AppText variant="largeTitle" style={styles.flex}>
            Days
          </AppText>
          <IconButton
            icon="search"
            label="Find a moment"
            onPress={() => {
              setSheet("filter");
            }}
          />
          <IconButton
            icon="info"
            label="When does a day end?"
            onPress={() => {
              setSheet("boundary");
            }}
          />
        </View>

        {filter !== null ? (
          <Animated.View entering={FadeIn} style={{ gap: spacing.lg }}>
            <Glass
              radius={radii.pill}
              shadow={false}
              style={styles.self}
              contentStyle={[styles.row, styles.capsule, { gap: spacing.sm }]}
            >
              <Icon name="search" size={15} color={colors.accent} />
              <AppText variant="footnote" weight="600">
                {filterSummary(filter, partner?.name ?? "")}
              </AppText>
              <Pressable
                onPress={() => {
                  setFilter(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={12}
              >
                <Icon name="x" size={16} color={colors.textSecondary} />
              </Pressable>
            </Glass>
            {results.data === undefined ? (
              <Skeleton />
            ) : results.data.length === 0 ? (
              <View style={[styles.center, { gap: spacing.md, paddingTop: spacing.xl }]}>
                <SideCharacter pose="thinking" size={150} shared />
                <AppText variant="callout" color="textSecondary">
                  Nothing found. Try another word or filter.
                </AppText>
              </View>
            ) : (
              results.data.map((group, gi) => (
                <Animated.View
                  key={group.date}
                  entering={FadeInDown.delay(gi * 50)
                    .springify()
                    .damping(18)}
                  style={{ gap: spacing.sm }}
                >
                  <AppText variant="footnote" color="textSecondary" weight="600">
                    {dayLabel(Temporal.PlainDate.from(group.date))}
                  </AppText>
                  {group.entries.map((e) => (
                    <ResultRow
                      key={e.id}
                      entry={e}
                      query={filter.query}
                      zone={me?.zone ?? "UTC"}
                      color={e.mine ? meColor : partnerColor}
                    />
                  ))}
                </Animated.View>
              ))
            )}
          </Animated.View>
        ) : (
          <>
            <Segmented
              label="View"
              options={[
                { label: "List", value: "list" },
                { label: "Calendar", value: "calendar" },
              ]}
              value={mode}
              onChange={setMode}
            />
            {data === undefined || me === undefined || partner === undefined ? (
              <Skeleton />
            ) : empty ? (
              <View style={[styles.center, { gap: spacing.md, paddingTop: spacing.xl }]}>
                <SideCharacter pose="writingLetter" size={180} shared />
                <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
                  Your days will gather here, one small moment at a time.
                </AppText>
              </View>
            ) : mode === "calendar" ? (
              <Animated.View entering={FadeIn.duration(240)}>
                <MonthCalendar
                  today={data.today}
                  days={data.days}
                  meName={me.name}
                  partnerName={partner.name}
                  meColor={meColor}
                  partnerColor={partnerColor}
                  onOpen={openDay}
                />
              </Animated.View>
            ) : (
              weeks.map((w, wi) => (
                <View key={w.label} style={{ gap: spacing.sm }}>
                  <AppText variant="footnote" color="textSecondary" weight="600">
                    {w.label}
                  </AppText>
                  {w.days.map((d, i) => (
                    <DayRow
                      key={d.date}
                      day={d}
                      meName={me.name}
                      partnerName={partner.name}
                      meColor={meColor}
                      partnerColor={partnerColor}
                      index={wi * 7 + i}
                    />
                  ))}
                </View>
              ))
            )}
          </>
        )}
        <View style={{ height: ADD_BUTTON_SPACE }} />
      </GlassScreen>
      <AddButton
        onPress={() => {
          router.push("/days/new");
        }}
      />
      {sheet === "filter" ? (
        <FilterSheet
          visible
          initial={filter}
          partnerName={partner?.name ?? "Partner"}
          onApply={(f) => {
            setFilter(f);
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {data === undefined || me === undefined || partner === undefined ? null : (
        <BoundarySheet
          visible={sheet === "boundary"}
          date={data.today}
          people={[me, partner]}
          onClose={() => {
            setSheet(null);
          }}
        />
      )}
    </View>
  );
}

function ResultRow({
  entry,
  query,
  zone,
  color,
}: {
  entry: EntryView;
  query: string;
  zone: string;
  color: string;
}) {
  const { radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => {
        router.push({ pathname: "/days/entry/[id]", params: { id: entry.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${entry.authorName}: ${entry.text}`}
    >
      <Glass
        radius={radii.lg}
        shadow={false}
        contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
      >
        <View style={[styles.bar, { backgroundColor: color }]} />
        <AppText variant="body" accessible={false}>
          {entry.emoji}
        </AppText>
        <Highlight text={entry.text} query={query} />
        <AppText variant="caption" color="textTertiary">
          {localTimeLabel(Temporal.Instant.from(entry.at), zone)}
        </AppText>
      </Glass>
    </Pressable>
  );
}

export function DaysScreen() {
  return (
    <SideScope side="garnet">
      <DaysContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  self: { alignSelf: "flex-start" },
  capsule: { paddingHorizontal: 14, paddingVertical: 8 },
  date: { width: 48, alignItems: "center" },
  thumb: { width: 52 },
  initial: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  initialSpace: { width: 20, height: 20 },
  skeleton: { height: 78 },
  bar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
});
