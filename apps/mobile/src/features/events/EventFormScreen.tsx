/**
 * EVT-03 · New or edit an event, in the viewer's colour. Kind, whose birthday, date, an
 * optional time in a named zone (shown in both zones; a time the clocks skip is refused with a
 * clear reason, ADR-0002), repeats, notes, a cover and reminders (simulated). The tab bar slides
 * away while the form is open.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import type { DemoArt } from "@/data/fixtures/demoDays";
import type { EventInput, EventView, HomePerson } from "@/data/repositories/types";
import { EVENT_KINDS, eventInstant, REMINDERS, REPEATS } from "@/domain/events";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { memoryDateLabel } from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { DatePickerSheet } from "./components/DatePickerSheet";
import { useEvent, useEvents, useSaveEvent } from "./useEvents";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

const ARTS: readonly DemoArt[] = ["sunrise", "sea", "night", "garden", "city", "coffee"];

type Draft = Omit<EventInput, "id">;

function draftOf(e: EventView | null, today: Temporal.PlainDate): Draft {
  return e === null
    ? {
        title: "",
        kind: "date",
        date: today.add({ days: 7 }).toString(),
        time: null,
        zone: null,
        repeats: "none",
        whose: null,
        description: "",
        reminders: ["day"],
        art: "sunrise",
      }
    : {
        title: e.title,
        kind: e.kind,
        date: e.first,
        time: e.time,
        zone: e.zone,
        repeats: e.repeats,
        whose: e.whose,
        description: e.description,
        reminders: e.reminders,
        art: e.art,
      };
}

function Form({
  id,
  initial,
  today,
  me,
  partner,
}: {
  id: string | undefined;
  initial: Draft;
  today: Temporal.PlainDate;
  me: HomePerson;
  partner: HomePerson;
}) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const save = useSaveEvent();
  const [d, setD] = useState<Draft>(initial);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<{ field: "title" | "time"; text: string } | null>(null);
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };
  const date = Temporal.PlainDate.from(d.date);
  const zone = d.zone ?? me.zone;
  const check = d.time === null ? null : eventInstant(date, d.time, zone);
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };

  const submit = () => {
    save.mutate(
      { ...(id === undefined ? {} : { id }), ...d, zone: d.time === null ? null : zone },
      {
        onSuccess: (r) => {
          if (r.ok) {
            toast.show(id === undefined ? "Event added." : "Saved.", "success");
            goBack("/moments");
            return;
          }
          setError(
            r.reason === "empty-title"
              ? { field: "title", text: "Give it a name." }
              : r.reason === "missing-time"
                ? {
                    field: "time",
                    text: `That time doesn't exist in ${cityForZone(zone)} that day (the clocks change). Pick another.`,
                  }
                : { field: "time", text: "Use a time like 19:30." },
          );
        },
        onError: (e) => {
          toast.show(serviceErrorMessage(e), "error");
        },
      },
    );
  };

  return (
    <>
      <GlassScreen
        onBack={() => {
          goBack("/moments");
        }}
        header={
          <AppText variant="headline" style={styles.textCenter}>
            {id === undefined ? "New event" : "Edit event"}
          </AppText>
        }
        footer={<Button label="Save" loading={save.isPending} onPress={submit} />}
      >
        <Animated.View {...enter()}>
          <MediaArt art={d.art} height={120} radius={radii.xl}>
            <View style={[styles.coverEmoji, { padding: spacing.lg }]}>
              <AppText variant="hero" accessible={false}>
                {EVENT_KINDS.find((k) => k.kind === d.kind)?.emoji}
              </AppText>
            </View>
          </MediaArt>
        </Animated.View>

        <Animated.View {...enter()}>
          <TextField
            label="Name"
            placeholder="Movie night, a visit, our day…"
            large
            value={d.title}
            onChangeText={(title) => {
              set({ title });
            }}
            maxLength={60}
            {...(error?.field === "title" ? { error: error.text } : {})}
          />
        </Animated.View>

        <Animated.View {...enter()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, padding: 4 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Kind of event"
          >
            {EVENT_KINDS.map((k) => (
              <GlassChip
                key={k.kind}
                leading={k.emoji}
                label={k.label}
                selected={d.kind === k.kind}
                onPress={() => {
                  set({
                    kind: k.kind,
                    repeats:
                      k.kind === "birthday" || k.kind === "anniversary" ? "yearly" : d.repeats,
                    whose: k.kind === "birthday" ? (d.whose ?? "partner") : null,
                  });
                }}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {d.kind === "birthday" ? (
          <Animated.View entering={ENTER}>
            <Segmented
              label="Whose birthday"
              options={[
                { label: partner.name, value: "partner" },
                { label: "Mine", value: "me" },
              ]}
              value={d.whose ?? "partner"}
              onChange={(whose) => {
                set({ whose });
              }}
            />
          </Animated.View>
        ) : null}

        <Animated.View {...enter()}>
          <Glass radius={radii.xl} contentStyle={{ paddingHorizontal: spacing.lg }}>
            <Pressable
              onPress={() => {
                setPicking(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Date: ${memoryDateLabel(date)}`}
              style={[styles.row, styles.line, { gap: spacing.md }]}
            >
              <Icon name="calendar" size={19} color={colors.textSecondary} />
              <AppText variant="callout" style={styles.flex}>
                Date
              </AppText>
              <AppText variant="callout" color="accent" weight="600">
                {memoryDateLabel(date)}
              </AppText>
            </Pressable>
            <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
            <View style={[styles.row, styles.line, { gap: spacing.md }]}>
              <Icon name="clock" size={19} color={colors.textSecondary} />
              <AppText variant="callout" style={styles.flex}>
                All day
              </AppText>
              <Toggle
                value={d.time === null}
                onValueChange={(allDay) => {
                  set({ time: allDay ? null : "19:00", zone: allDay ? null : (d.zone ?? me.zone) });
                }}
                accessibilityLabel="All day"
              />
            </View>
            {d.time === null ? null : (
              <Animated.View
                entering={ENTER}
                style={{ gap: spacing.sm, paddingBottom: spacing.md }}
              >
                <TextField
                  label="Time"
                  value={d.time}
                  onChangeText={(time) => {
                    set({ time });
                  }}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  {...(error?.field === "time" ? { error: error.text } : {})}
                />
                <Segmented
                  label="Time zone"
                  options={[
                    { label: cityForZone(me.zone), value: me.zone },
                    { label: cityForZone(partner.zone), value: partner.zone },
                  ]}
                  value={zone}
                  onChange={(z) => {
                    set({ zone: z });
                  }}
                />
                {check?.ok === true ? (
                  <AppText variant="footnote" color="textSecondary">
                    {`${localTimeLabel(check.instant, me.zone)} ${cityForZone(me.zone)} · ${localTimeLabel(check.instant, partner.zone)} ${cityForZone(partner.zone)}`}
                  </AppText>
                ) : null}
              </Animated.View>
            )}
          </Glass>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Repeats
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {REPEATS.map((r) => (
              <GlassChip
                key={r.id}
                label={r.label}
                selected={d.repeats === r.id}
                onPress={() => {
                  set({ repeats: r.id });
                }}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View {...enter()}>
          <TextField
            label="Notes"
            placeholder="Anything to remember"
            rows={3}
            value={d.description}
            onChangeText={(description) => {
              set({ description });
            }}
            maxLength={300}
          />
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Cover
          </AppText>
          <View accessibilityRole="radiogroup" style={[styles.row, styles.spread]}>
            {ARTS.map((art) => {
              const on = d.art === art;
              return (
                <Pressable
                  key={art}
                  onPress={() => {
                    set({ art });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Cover ${art}`}
                  style={[styles.swatch, { borderColor: on ? colors.accent : "transparent" }]}
                >
                  <MediaArt art={art} height={44} radius={12} />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Remind us
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {REMINDERS.map((r) => (
              <GlassChip
                key={r.id}
                role="checkbox"
                label={r.label}
                selected={d.reminders.includes(r.id)}
                onPress={() => {
                  set({
                    reminders: d.reminders.includes(r.id)
                      ? d.reminders.filter((x) => x !== r.id)
                      : [...d.reminders, r.id],
                  });
                }}
              />
            ))}
          </View>
          <AppText variant="caption" color="textTertiary">
            Reminders arrive as notifications on this phone.
          </AppText>
        </Animated.View>
      </GlassScreen>
      {picking ? (
        <DatePickerSheet
          value={date}
          today={today}
          title="Pick a date"
          onPick={(picked) => {
            set({ date: picked.toString() });
            setPicking(false);
          }}
          onClose={() => {
            setPicking(false);
          }}
        />
      ) : null}
    </>
  );
}

export function EventFormScreen({ id }: { id?: string }) {
  const list = useEvents();
  const existing = useEvent(id ?? "");
  const data = list.data;
  if (data === undefined || (id !== undefined && existing.data === undefined))
    return (
      <GlassScreen
        onBack={() => {
          goBack("/moments");
        }}
      >
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  const today = Temporal.PlainDate.from(data.today);
  return (
    <SideScope side={data.me.side ?? "garnet"}>
      <View style={styles.fill}>
        <Form
          id={id}
          initial={draftOf(id === undefined ? null : (existing.data ?? null), today)}
          today={today}
          me={data.me}
          partner={data.partner}
        />
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
  textCenter: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  spread: { justifyContent: "space-between" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  line: { minHeight: 54 },
  hairline: { height: StyleSheet.hairlineWidth },
  coverEmoji: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  swatch: { width: "15%", borderWidth: 2.5, borderRadius: 15, overflow: "hidden" },
});
