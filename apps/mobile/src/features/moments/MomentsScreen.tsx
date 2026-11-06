/**
 * Moments (EVT-01, OPEN-01; redesign P-59): one shared page, Garnet violet, with Events and
 * Open When side by side. Events: the next one as a hero, then a list or a month with gem
 * markers, times in both zones. Open When: glass envelopes sealed in each author's colour,
 * never a word of a sealed letter (A9). Surprises come later (gate B-04).
 */
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { SurprisesSection } from "@/features/surprises/SurprisesSection";
import type { EventView, HomePerson } from "@/data/repositories/types";
import { countdownLabel } from "@/domain/events";
import { memoryDateLabel } from "@/domain/memories";
import { formatPromptTitle, type OpenWhenView } from "@/domain/openWhen";
import { monthGrid, monthLabel } from "@/domain/days";
import { MediaArt } from "@/features/days/components/MediaArt";
import {
  bothZones,
  EventGem,
  eventColors,
  EventRow,
} from "@/features/events/components/EventParts";
import { useEvents } from "@/features/events/useEvents";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { GemCapsule } from "@/features/openWhen/components/GemCapsule";
import { useLetterSides, useOpenWhenList } from "@/features/openWhen/useOpenWhen";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

export type MomentsTab = "events" | "letters" | "surprises";

function openEvent(id: string) {
  router.push({ pathname: "/moments/event/[id]", params: { id } });
}

/** Whether an event comes round on a date in this month (for the calendar's gem markers). */
function dayIn(e: EventView, month: Temporal.PlainYearMonth): number | null {
  const first = Temporal.PlainDate.from(e.first);
  if (e.repeats === "none") return first.toPlainYearMonth().equals(month) ? first.day : null;
  if (Temporal.PlainYearMonth.compare(month, first.toPlainYearMonth()) < 0) return null;
  if (e.repeats === "yearly" && first.month !== month.month) return null;
  return Math.min(first.day, month.daysInMonth);
}

function EventCalendar({
  events,
  today,
  me,
  partner,
}: {
  events: readonly EventView[];
  today: Temporal.PlainDate;
  me: HomePerson;
  partner: HomePerson;
}) {
  const { colors, radii, spacing } = useTheme();
  const [month, setMonth] = useState(() => today.toPlainYearMonth());
  const [picked, setPicked] = useState<number | null>(null);
  const byDay = new Map<number, EventView[]>();
  for (const e of events) {
    const d = dayIn(e, month);
    if (d !== null) byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  const shown = picked === null ? [] : (byDay.get(picked) ?? []);
  return (
    <View style={{ gap: spacing.md }}>
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        <View style={styles.row}>
          <IconButton
            icon="chevron-left"
            label="Previous month"
            onPress={() => {
              setMonth((m) => m.subtract({ months: 1 }));
              setPicked(null);
            }}
          />
          <AppText variant="headline" style={styles.flexCenter} accessibilityRole="header">
            {monthLabel(month.year, month.month)}
          </AppText>
          <IconButton
            icon="chevron-right"
            label="Next month"
            onPress={() => {
              setMonth((m) => m.add({ months: 1 }));
              setPicked(null);
            }}
          />
        </View>
        <Animated.View key={month.toString()} entering={ENTER} style={{ gap: 4 }}>
          {monthGrid(month.year, month.month).map((week, w) => (
            <View key={w} style={styles.row}>
              {week.map((d, i) => {
                if (d === null) return <View key={i} style={styles.cell} />;
                const list = byDay.get(d.day) ?? [];
                const isToday = d.equals(today);
                const on = picked === d.day;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setPicked(on ? null : d.day);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${memoryDateLabel(d)}${list.length > 0 ? `, ${list.map((e) => e.title).join(", ")}` : ""}`}
                    style={[
                      styles.cell,
                      {
                        borderRadius: radii.md,
                        borderWidth: isToday ? 2 : 0,
                        borderColor: colors.accent,
                        backgroundColor: on ? colors.accentSoft : "transparent",
                      },
                    ]}
                  >
                    <AppText variant="callout" weight={isToday ? "600" : "400"}>
                      {d.day}
                    </AppText>
                    <View style={styles.markers}>
                      {list.slice(0, 3).map((e) => (
                        <View
                          key={e.id}
                          style={[
                            styles.marker,
                            { backgroundColor: eventColors(e, me, partner)[0] },
                          ]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </Glass>
      {shown.map((e) => (
        <Animated.View key={e.id} entering={ENTER}>
          <EventRow
            event={e}
            today={today.toString()}
            me={me}
            partner={partner}
            onPress={() => {
              openEvent(e.id);
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function EventsSection() {
  const { radii, spacing, reduceMotion } = useTheme();
  const events = useEvents();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const data = events.data;
  if (data === undefined) return <ActivityIndicator accessibilityLabel="Loading" />;
  const today = Temporal.PlainDate.from(data.today);
  const upcoming = data.events.filter((e) => e.next !== null);
  const hero = upcoming[0];
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  return (
    <View style={{ gap: spacing.lg }}>
      {hero === undefined ? null : (
        <Animated.View {...enter()}>
          <Pressable
            onPress={() => {
              openEvent(hero.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Next: ${hero.title}, ${countdownLabel(today, Temporal.PlainDate.from(hero.next ?? hero.first))}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xs }}>
              <MediaArt art={hero.art} height={176} radius={radii.xl}>
                <View style={[styles.heroInner, { padding: spacing.lg }]}>
                  <EventGem
                    colors={eventColors(hero, data.me, data.partner)}
                    emoji={hero.emoji}
                    size={56}
                  />
                  <View style={styles.flex} />
                  <Glass
                    radius={radii.lg}
                    contentStyle={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      gap: 2,
                    }}
                  >
                    <AppText variant="headline" numberOfLines={1}>
                      {hero.title}
                    </AppText>
                    <AppText variant="footnote" color="textSecondary">
                      {countdownLabel(today, Temporal.PlainDate.from(hero.next ?? hero.first))}
                      {bothZones(hero, data.me, data.partner) === null
                        ? ""
                        : ` · ${bothZones(hero, data.me, data.partner) ?? ""}`}
                    </AppText>
                  </Glass>
                </View>
              </MediaArt>
            </Glass>
          </Pressable>
        </Animated.View>
      )}
      <Segmented
        label="Events view"
        options={[
          { label: "List", value: "list" },
          { label: "Calendar", value: "calendar" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {data.events.length === 0 ? (
        <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xl }]}>
          <CharacterSlot
            character="garnet"
            look={{ mood: "calm", occasion: "everyday" }}
            size={160}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            Dates that matter to you both will appear here.
          </AppText>
        </View>
      ) : mode === "calendar" ? (
        <EventCalendar events={data.events} today={today} me={data.me} partner={data.partner} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {data.events.map((e) => (
            <Animated.View key={e.id} {...enter()}>
              <EventRow
                event={e}
                today={data.today}
                me={data.me}
                partner={data.partner}
                onPress={() => {
                  openEvent(e.id);
                }}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

function statusOf(
  letter: Exclude<OpenWhenView, { kind: "unavailable" }>,
  partnerName: string,
): string {
  switch (letter.kind) {
    case "draft":
      return "Draft";
    case "opened":
      return "Opened";
    case "sealed":
      return letter.viewerIsRecipient
        ? letter.eligible
          ? "Ready to open"
          : "Sealed"
        : `Sealed for ${partnerName}`;
  }
}

function LetterCard({ letter, partnerName }: { letter: OpenWhenView; partnerName: string }) {
  const { colors, radii, spacing } = useTheme();
  const sides = useLetterSides();
  const open = () => {
    router.push({ pathname: "/moments/open-when/[id]", params: { id: letter.id } });
  };
  if (letter.kind === "unavailable")
    return (
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Unavailable letter"
        style={styles.letter}
      >
        <Glass
          radius={radii.xl}
          shadow={false}
          contentStyle={[styles.letterInner, { padding: spacing.md, gap: spacing.sm }]}
        >
          <GemCapsule state="unavailable" size="sm" />
          <AppText variant="caption" color="textTertiary" style={styles.textCenter}>
            This item isn't available here.
          </AppText>
        </Glass>
      </Pressable>
    );
  const mine = letter.kind === "draft" || !letter.viewerIsRecipient;
  const state =
    letter.kind === "draft"
      ? "draft"
      : letter.kind === "opened"
        ? "opened"
        : letter.viewerIsRecipient && letter.eligible
          ? "ready"
          : "sealed";
  const status = statusOf(letter, partnerName);
  const title = formatPromptTitle(letter.safePrompt);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${mine ? "From you" : `From ${partnerName}`}. ${status}`}
      style={({ pressed }) => [styles.letter, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <Glass
        radius={radii.xl}
        tint={state === "ready" ? (mine ? sides.mine : sides.theirs) : "none"}
        contentStyle={[styles.letterInner, { padding: spacing.md, gap: spacing.sm }]}
      >
        <GemCapsule side={mine ? sides.mine : sides.theirs} state={state} size="sm" />
        <AppText variant="callout" serif style={styles.textCenter} numberOfLines={3}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {mine ? "From you" : `From ${partnerName}`}
        </AppText>
        <View
          style={[
            styles.chip,
            {
              borderColor: state === "ready" ? colors.accent : colors.glassRimEnd,
              backgroundColor: state === "ready" ? colors.accentSoft : colors.glassVeilSoft,
            },
          ]}
        >
          <AppText
            variant="caption"
            weight="600"
            color={state === "ready" ? "accent" : "textSecondary"}
          >
            {status}
          </AppText>
        </View>
      </Glass>
    </Pressable>
  );
}

function LettersSection({ partnerName }: { partnerName: string }) {
  const { spacing, reduceMotion } = useTheme();
  const letters = useOpenWhenList();
  const sides = useLetterSides();
  const [tab, setTab] = useState<"forMe" | "fromMe">("forMe");
  const shown = (letters.data ?? []).filter((l) =>
    l.kind === "unavailable"
      ? true
      : tab === "forMe"
        ? l.kind !== "draft" && l.viewerIsRecipient
        : l.kind === "draft" || !l.viewerIsRecipient,
  );
  const myGem = sides.mine;
  return (
    <View style={{ gap: spacing.lg }}>
      <Segmented
        label="Open When letters"
        options={[
          { label: "For me", value: "forMe" },
          { label: "From me", value: "fromMe" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {letters.data === undefined ? (
        <ActivityIndicator accessibilityLabel="Loading" />
      ) : shown.length === 0 ? (
        <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.lg }]}>
          <CharacterSlot
            character={myGem}
            look={{ mood: "dreamy", occasion: "openWhen" }}
            size={170}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            {tab === "forMe"
              ? `Letters from ${partnerName} will rest here until you need them.`
              : "Leave something for the days apart."}
          </AppText>
        </View>
      ) : (
        <View style={[styles.grid, { gap: spacing.md }]}>
          {shown.map((l) => (
            <Animated.View
              key={l.id}
              style={styles.half}
              {...(reduceMotion
                ? {}
                : {
                    entering: ENTER,
                  })}
            >
              <LetterCard letter={l} partnerName={partnerName} />
            </Animated.View>
          ))}
        </View>
      )}
      <Button
        label="Write a letter"
        accessibilityHint="Write an Open When letter"
        testID="write-letter"
        onPress={() => {
          router.push("/moments/open-when/new");
        }}
      />
    </View>
  );
}

function Moments({ initial }: { initial: MomentsTab }) {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<MomentsTab>(initial);
  const events = useEvents();
  const partner = events.data?.partner;
  return (
    <GlassScreen tabBar>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="largeTitle" style={styles.flex}>
          Moments
        </AppText>
        <IconButton
          icon="plus"
          label={
            tab === "events"
              ? "Add an event"
              : tab === "letters"
                ? "Write an Open When letter"
                : "Create a surprise"
          }
          onPress={() => {
            router.push(
              tab === "events"
                ? "/moments/event-new"
                : tab === "letters"
                  ? "/moments/open-when/new"
                  : "/moments/surprises/new",
            );
          }}
        />
      </View>
      <Segmented
        label="Moments"
        options={[
          { label: "Events", value: "events" },
          { label: "Open When", value: "letters" },
          { label: "Surprises", value: "surprises" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Animated.View key={tab} entering={ENTER}>
        {tab === "events" ? (
          <EventsSection />
        ) : tab === "letters" ? (
          <LettersSection partnerName={partner?.name ?? "Noah"} />
        ) : (
          <SurprisesSection />
        )}
      </Animated.View>
    </GlassScreen>
  );
}

export function MomentsScreen({ initial = "events" }: { initial?: MomentsTab }) {
  return (
    <SideScope side="garnet">
      <Moments initial={initial} />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center" },
  centerRow: { justifyContent: "center" },
  textCenter: { textAlign: "center" },
  heroInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  markers: { flexDirection: "row", gap: 2, height: 6, marginTop: 2 },
  marker: { width: 6, height: 6, borderRadius: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  half: { width: "48%" },
  letter: { flex: 1 },
  letterInner: { alignItems: "center", minHeight: 236, justifyContent: "center" },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
});
