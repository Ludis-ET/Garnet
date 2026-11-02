/**
 * MEM-04 · New or edit a memory, in the author's colour: a picture, video or voice note
 * (simulated), a title, the story, the date, a place (optional, never automatic), tags and
 * collections. Leaving with changes asks first (§5 forgiving UX). The tab bar slides away.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { MemoryInput, MemoryView } from "@/data/repositories/types";
import { memoryDateLabel, MEMORY_TAGS } from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { DatePickerSheet } from "@/features/events/components/DatePickerSheet";
import { useHomeToday } from "@/features/home/useHome";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { useCollections, useMemory, useSaveMemory } from "./useMemories";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

type Draft = Omit<MemoryInput, "id">;

function draftOf(m: MemoryView | null, today: Temporal.PlainDate): Draft {
  return m === null
    ? {
        title: "",
        story: "",
        date: today.toString(),
        place: "",
        media: null,
        tags: [],
        collectionIds: [],
      }
    : {
        title: m.title,
        story: m.story,
        date: m.date,
        place: m.place,
        media: m.media,
        tags: m.tags,
        collectionIds: m.collections.map((c) => c.id),
      };
}

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.flex, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <Glass radius={radii.lg} shadow={false} contentStyle={[styles.tile, { gap: spacing.xs }]}>
        <Icon name={icon} size={22} color={colors.accent} />
        <AppText variant="caption" weight="600" color="textSecondary">
          {label}
        </AppText>
      </Glass>
    </Pressable>
  );
}

function Form({
  id,
  initial,
  today,
}: {
  id: string | undefined;
  initial: Draft;
  today: Temporal.PlainDate;
}) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const save = useSaveMemory();
  const collections = useCollections();
  const [d, setD] = useState<Draft>(initial);
  const [sheet, setSheet] = useState<"media" | "voice" | "date" | "leave" | null>(null);
  const [error, setError] = useState(false);
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(false);
  };
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  const toggle = (list: readonly string[], x: string) =>
    list.includes(x) ? list.filter((y) => y !== x) : [...list, x];

  return (
    <>
      <GlassScreen
        onBack={() => {
          if (dirty) setSheet("leave");
          else goBack("/our-world");
        }}
        header={
          <AppText variant="headline" style={styles.textCenter}>
            {id === undefined ? "New memory" : "Edit memory"}
          </AppText>
        }
        footer={
          <Button
            label="Save memory"
            loading={save.isPending}
            onPress={() => {
              if (d.title.trim().length === 0) {
                setError(true);
                return;
              }
              save.mutate(
                { ...(id === undefined ? {} : { id }), ...d },
                {
                  onSuccess: () => {
                    toast.show("Saved to Memories.", "success");
                    goBack("/our-world");
                  },
                  onError: (e) => {
                    toast.show(serviceErrorMessage(e), "error");
                  },
                },
              );
            }}
          />
        }
      >
        <Animated.View {...enter()}>
          {d.media === null ? (
            <View style={[styles.row, { gap: spacing.sm }]}>
              <Tile
                icon="image"
                label="Photo"
                onPress={() => {
                  setSheet("media");
                }}
              />
              <Tile
                icon="video"
                label="Video"
                onPress={() => {
                  setSheet("media");
                }}
              />
              <Tile
                icon="mic"
                label="Voice"
                onPress={() => {
                  setSheet("voice");
                }}
              />
            </View>
          ) : (
            <Animated.View entering={ENTER}>
              <Glass radius={radii.xl} contentStyle={{ padding: spacing.xs }}>
                {d.media.type === "voice" ? (
                  <View style={{ padding: spacing.md }}>
                    <VoicePlayer seconds={d.media.seconds} wave={d.media.wave} />
                  </View>
                ) : (
                  <MediaArt
                    art={d.media.art}
                    {...(d.media.type === "video" ? { seconds: d.media.seconds } : {})}
                    height={220}
                    radius={radii.xl - 4}
                  />
                )}
                <Pressable
                  onPress={() => {
                    set({ media: null });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove"
                  hitSlop={8}
                  style={styles.remove}
                >
                  <Glass radius={16} shadow={false} contentStyle={styles.removeInner}>
                    <Icon name="x" size={16} color={colors.textPrimary} />
                  </Glass>
                </Pressable>
              </Glass>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.md }}>
          <TextField
            label="Title"
            placeholder="The airport goodbye"
            large
            value={d.title}
            onChangeText={(title) => {
              set({ title });
            }}
            maxLength={80}
            {...(error ? { error: "Give it a name." } : {})}
          />
          <TextField
            label="The story"
            placeholder="What happened, what you felt…"
            rows={4}
            value={d.story}
            onChangeText={(story) => {
              set({ story });
            }}
            maxLength={1000}
          />
        </Animated.View>

        <Animated.View {...enter()}>
          <Glass radius={radii.xl} contentStyle={{ paddingHorizontal: spacing.lg }}>
            <Pressable
              onPress={() => {
                setSheet("date");
              }}
              accessibilityRole="button"
              accessibilityLabel={`Date: ${memoryDateLabel(Temporal.PlainDate.from(d.date))}`}
              style={[styles.row, styles.line, { gap: spacing.md }]}
            >
              <Icon name="calendar" size={19} color={colors.textSecondary} />
              <AppText variant="callout" style={styles.flex}>
                Date
              </AppText>
              <AppText variant="callout" color="accent" weight="600">
                {memoryDateLabel(Temporal.PlainDate.from(d.date))}
              </AppText>
            </Pressable>
          </Glass>
        </Animated.View>

        <Animated.View {...enter()}>
          <TextField
            label="Place (optional)"
            placeholder="Only if you want"
            value={d.place}
            onChangeText={(place) => {
              set({ place });
            }}
            maxLength={60}
          />
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Tags
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {MEMORY_TAGS.map((t) => (
              <GlassChip
                key={t}
                role="checkbox"
                label={`#${t}`}
                selected={d.tags.includes(t)}
                onPress={() => {
                  set({ tags: toggle(d.tags, t) });
                }}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Add to collection
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {(collections.data ?? []).map((c) => (
              <GlassChip
                key={c.id}
                role="checkbox"
                leading="📁"
                label={c.title}
                selected={d.collectionIds.includes(c.id)}
                onPress={() => {
                  set({ collectionIds: toggle(d.collectionIds, c.id) });
                }}
              />
            ))}
          </View>
        </Animated.View>
      </GlassScreen>

      {sheet === "media" ? (
        <MediaPickerSheet
          visible
          onPick={(media: DemoMedia) => {
            set({ media });
            setSheet(null);
          }}
          onVoice={() => {
            setSheet("voice");
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === "voice" ? (
        <VoiceRecorderSheet
          visible
          onSave={(media) => {
            set({ media });
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === "date" ? (
        <DatePickerSheet
          value={Temporal.PlainDate.from(d.date)}
          today={today}
          title="When was it?"
          onPick={(date) => {
            set({ date: date.toString() });
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      <ActionSheet
        visible={sheet === "leave"}
        title="Leave without saving?"
        body="Your changes won't be kept."
        confirmLabel="Discard"
        destructive
        cancelLabel="Keep editing"
        onCancel={() => {
          setSheet(null);
        }}
        onConfirm={() => {
          setSheet(null);
          goBack("/our-world");
        }}
      />
    </>
  );
}

export function MemoryFormScreen({ id }: { id?: string }) {
  const home = useHomeToday();
  const existing = useMemory(id ?? "");
  const me = home.data?.me;
  if (me === undefined || (id !== undefined && existing.data === undefined))
    return (
      <GlassScreen
        onBack={() => {
          goBack("/our-world");
        }}
      >
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  const today = Temporal.Now.instant().toZonedDateTimeISO(me.zone).toPlainDate();
  return (
    <SideScope side={me.side ?? "garnet"}>
      <View style={styles.fill}>
        <Form
          id={id}
          initial={draftOf(id === undefined ? null : (existing.data ?? null), today)}
          today={today}
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
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  line: { minHeight: 54 },
  tile: { height: 78, alignItems: "center", justifyContent: "center" },
  remove: { position: "absolute", top: 12, right: 12 },
  removeInner: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
