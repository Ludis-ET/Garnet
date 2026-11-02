/**
 * EVT-02 event detail, EVT-04 reminders, EVT-05 birthday mode, EVT-06 anniversary mode.
 * Birthdays and anniversaries are special pages, not alerts (§24–28): the birthday person's
 * colour leads (their character celebrating on a glass plinth); an anniversary belongs to both
 * (Ruby and Sapphire together, Garnet violet). Times show in both zones. Reminders are simulated.
 * Surprise content stays hidden (A9).
 */
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { EventView, HomePerson, MemoryView } from "@/data/repositories/types";
import { countdownLabel, kindOf, REMINDERS, type ReminderId } from "@/domain/events";
import { memoryDateLabel } from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useMemories } from "@/features/memories/useMemories";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { bothZones, EventGem, eventColors } from "./components/EventParts";
import { useEvent, useEvents, useRemoveEvent, useSaveEvent } from "./useEvents";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

function openMemory(id: string) {
  router.push({ pathname: "/our-world/memory/[id]", params: { id } });
}

/** A horizontal strip of memory pictures. */
function MemoryStrip({ memories }: { memories: readonly MemoryView[] }) {
  const { radii, spacing } = useTheme();
  const pics = memories.filter((m) => m.media !== null && m.media.type !== "voice");
  if (pics.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
    >
      {pics.map((m) => {
        const media = m.media;
        if (media === null || media.type === "voice") return null;
        return (
          <Pressable
            key={m.id}
            onPress={() => {
              openMemory(m.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={m.title}
            style={styles.stripItem}
          >
            <MediaArt
              art={media.art}
              {...(media.type === "video" ? { seconds: media.seconds } : {})}
              height={150}
              radius={radii.lg}
            />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {m.title}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode; index: number }) {
  const { spacing, reduceMotion } = useTheme();
  return (
    <Animated.View
      {...(reduceMotion
        ? {}
        : {
            entering: ENTER,
          })}
      style={{ gap: spacing.sm }}
    >
      <AppText variant="headline">{title}</AppText>
      {children}
    </Animated.View>
  );
}

function EventBody({
  event,
  today,
  me,
  partner,
}: {
  event: EventView;
  today: Temporal.PlainDate;
  me: HomePerson;
  partner: HomePerson;
}) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const save = useSaveEvent();
  const remove = useRemoveEvent();
  const memories = useMemories();
  const [dialog, setDialog] = useState<"reminders" | "delete" | null>(null);
  const [reminders, setReminders] = useState<readonly ReminderId[]>(event.reminders);
  const next = event.next === null ? null : Temporal.PlainDate.from(event.next);
  const isToday = next?.equals(today) === true;
  const person = event.whose === "me" ? me : event.whose === "partner" ? partner : null;
  const zones = bothZones(event, me, partner);
  const all = memories.data ?? [];
  const special = event.kind === "birthday" || event.kind === "anniversary";
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const dateLine = `${next === null ? memoryDateLabel(Temporal.PlainDate.from(event.first)) : memoryDateLabel(next)}${
    next === null ? "" : ` · ${countdownLabel(today, next)}`
  }`;

  const hero =
    event.kind === "birthday" ? (
      <View style={styles.center}>
        <View style={styles.stage}>
          <CharacterSlot
            character={person?.side ?? "garnet"}
            look={{ mood: "celebrating", occasion: "birthday" }}
            size={230}
            aspectRatio={FRAME_ASPECT}
          />
          {reduceMotion ? null : <SparkleBurst play />}
        </View>
        <Glass radius={999} veil="soft" style={styles.plinth} contentStyle={styles.plinthInner}>
          <View />
        </Glass>
      </View>
    ) : event.kind === "anniversary" ? (
      <View style={styles.center}>
        <View style={[styles.stage, styles.row, styles.together]}>
          <CharacterSlot
            character={me.side === "sapphire" ? "sapphire" : "ruby"}
            look={{ mood: "loving", occasion: "anniversary" }}
            size={200}
            aspectRatio={FRAME_ASPECT}
          />
          <CharacterSlot
            character={me.side === "sapphire" ? "ruby" : "sapphire"}
            look={{ mood: "loving", occasion: "anniversary" }}
            size={210}
            aspectRatio={FRAME_ASPECT}
          />
          {reduceMotion ? null : <SparkleBurst play />}
        </View>
        <Glass
          radius={999}
          veil="soft"
          tint="garnet"
          style={styles.plinth}
          contentStyle={styles.plinthInner}
        >
          <View />
        </Glass>
      </View>
    ) : (
      <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xs }}>
        <MediaArt art={event.art} height={190} radius={radii.xl}>
          <View style={[styles.cover, { padding: spacing.lg }]}>
            <EventGem colors={eventColors(event, me, partner)} emoji={event.emoji} size={60} />
          </View>
        </MediaArt>
      </Glass>
    );

  const title =
    event.kind === "birthday"
      ? isToday
        ? `Happy birthday, ${person?.name ?? ""}`
        : event.title
      : event.kind === "anniversary"
        ? "A day that matters to you both"
        : event.title;

  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          goBack("/moments");
        }}
        headerRight={
          <Pressable
            onPress={() => {
              router.push({ pathname: "/moments/event-new", params: { id: event.id } });
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit"
            hitSlop={8}
          >
            <Glass radius={22} contentStyle={styles.round}>
              <Icon name="edit" size={18} color={colors.textPrimary} />
            </Glass>
          </Pressable>
        }
      >
        <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>{hero}</Animated.View>

        <Animated.View
          {...(reduceMotion ? {} : { entering: ENTER })}
          style={[styles.center, { gap: spacing.xs }]}
        >
          <AppText variant="largeTitle" serif style={styles.textCenter}>
            {title}
          </AppText>
          {event.kind === "anniversary" ? (
            <AppText variant="callout" color="textSecondary">
              {event.title}
              {event.occurrence > 0
                ? ` · ${String(event.occurrence)} ${event.occurrence === 1 ? "year" : "years"}`
                : ""}
            </AppText>
          ) : null}
          <View style={[styles.row, { gap: spacing.sm }]}>
            <GlassChip
              label={kindOf(event.kind).label}
              leading={event.emoji}
              selected={false}
              onPress={() => undefined}
              disabled
            />
          </View>
          <AppText variant="callout" weight="600">
            {dateLine}
          </AppText>
          {zones === null ? null : (
            <AppText variant="footnote" color="textSecondary">
              {zones}
            </AppText>
          )}
        </Animated.View>

        {event.description.length === 0 ? null : (
          <Section
            title={special ? (event.mine ? "From you" : `From ${partner.name}`) : "Notes"}
            index={0}
          >
            <Glass
              radius={radii.xl}
              tint={special ? (person?.side ?? "garnet") : "none"}
              contentStyle={{ padding: spacing.lg }}
            >
              <AppText variant="body" serif italic={special}>
                {event.description}
              </AppText>
            </Glass>
          </Section>
        )}

        {event.kind === "birthday" && event.whose === "partner" ? (
          <Section title="Getting ready" index={1}>
            <Pressable
              onPress={() => {
                router.push("/moments/open-when/new");
              }}
              accessibilityRole="button"
              accessibilityLabel="Write a birthday letter"
            >
              <Glass
                radius={radii.xl}
                tint="garnet"
                contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
              >
                <AppText variant="title">🎁</AppText>
                <View style={styles.flex}>
                  <AppText variant="callout" weight="600">
                    Leave something waiting
                  </AppText>
                  <AppText variant="footnote" color="textSecondary">
                    A sealed letter {partner.name} can open on the day.
                  </AppText>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} />
              </Glass>
            </Pressable>
          </Section>
        ) : null}

        {special ? (
          <Section title={event.kind === "birthday" ? "Birthday memories" : "Our photos"} index={2}>
            <MemoryStrip
              memories={
                event.kind === "birthday"
                  ? all.filter((m) => m.collections.some((c) => c.title === "Birthdays"))
                  : all
              }
            />
          </Section>
        ) : null}

        <Section title="Reminders" index={3}>
          <Pressable
            onPress={() => {
              setDialog("reminders");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Reminders: ${
              event.reminders.length === 0
                ? "none"
                : REMINDERS.filter((r) => event.reminders.includes(r.id))
                    .map((r) => r.label)
                    .join(", ")
            }`}
          >
            <Glass
              radius={radii.xl}
              contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
            >
              <Icon name="clock" size={19} color={colors.textSecondary} />
              <AppText variant="callout" style={styles.flex}>
                {event.reminders.length === 0
                  ? "None"
                  : REMINDERS.filter((r) => event.reminders.includes(r.id))
                      .map((r) => r.label)
                      .join(" · ")}
              </AppText>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </Glass>
          </Pressable>
        </Section>

        <Button
          label="Delete event"
          variant="text"
          onPress={() => {
            setDialog("delete");
          }}
        />
      </GlassScreen>

      <Sheet
        visible={dialog === "reminders"}
        title="Reminders"
        onClose={() => {
          setDialog(null);
        }}
        footer={
          <Button
            label="Done"
            loading={save.isPending}
            onPress={() => {
              save.mutate(
                {
                  id: event.id,
                  title: event.title,
                  kind: event.kind,
                  date: event.first,
                  time: event.time,
                  zone: event.zone,
                  repeats: event.repeats,
                  whose: event.whose,
                  description: event.description,
                  reminders: [...reminders],
                  art: event.art,
                },
                {
                  onSuccess: () => {
                    setDialog(null);
                    toast.show("Reminders saved.", "success");
                  },
                  onError,
                },
              );
            }}
          />
        }
      >
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {REMINDERS.map((r) => (
            <GlassChip
              key={r.id}
              role="checkbox"
              label={r.label}
              selected={reminders.includes(r.id)}
              onPress={() => {
                setReminders((x) =>
                  x.includes(r.id) ? x.filter((y) => y !== r.id) : [...x, r.id],
                );
              }}
            />
          ))}
        </View>
        <AppText variant="footnote" color="textSecondary">
          In the app and as a notification. You'll get one reminder per time.
        </AppText>
      </Sheet>
      <ActionSheet
        visible={dialog === "delete"}
        title="Delete this event?"
        body={`It's removed for you and ${partner.name}.`}
        icon="trash"
        confirmLabel="Delete"
        destructive
        confirming={remove.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          remove.mutate(event.id, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Deleted.");
              goBack("/moments");
            },
            onError,
          });
        }}
      />
    </>
  );
}

export function EventScreen({ id }: { id: string }) {
  const event = useEvent(id);
  const list = useEvents();
  const data = list.data;
  if (event.data === undefined || data === undefined)
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
  if (event.data === null)
    return (
      <SideScope side="garnet">
        <GlassScreen
          onBack={() => {
            goBack("/moments");
          }}
        >
          <View style={[styles.grow, styles.center]}>
            <AppText variant="callout" color="textSecondary">
              This item isn't available here.
            </AppText>
          </View>
        </GlassScreen>
      </SideScope>
    );
  const e = event.data;
  // The birthday person's colour leads; anniversaries and the rest are shared (Garnet).
  const side =
    e.kind === "birthday"
      ? ((e.whose === "me" ? data.me.side : e.whose === "partner" ? data.partner.side : null) ??
        "garnet")
      : "garnet";
  return (
    <SideScope side={side}>
      <View style={styles.fill}>
        <EventBody
          event={e}
          today={Temporal.PlainDate.from(data.today)}
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
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  center: { alignItems: "center", justifyContent: "center" },
  textCenter: { textAlign: "center" },
  stage: { zIndex: 2, alignItems: "center" },
  together: { alignItems: "flex-end", marginBottom: -2 },
  plinth: { width: 220, marginTop: -26 },
  plinthInner: { height: 44 },
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  round: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stripItem: { width: 132, gap: 4 },
});
