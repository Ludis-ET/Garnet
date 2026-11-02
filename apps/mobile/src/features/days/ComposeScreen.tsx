/**
 * DAYS-06 · New or edit a moment, in the author's colour (P-55). Kind, words, one picture, video
 * or voice note (simulated, DAYS-07/08), feeling and activity (DAYS-09), place, and who sees it.
 * Day-log rule 2: a new moment is "Only you" until the author chooses otherwise; once shared it
 * stays shared (P-20). The time is "now" and can't be changed yet (U-11 open). Leaving with
 * unsaved words asks first and offers to keep them as a private draft (§5 forgiving UX).
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SideCharacter } from "@/components/character/SideCharacter";
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
import type { EntryInput, EntryView } from "@/data/repositories/types";
import {
  ACTIVITIES,
  ENTRY_KINDS,
  FEELINGS,
  kindMeta,
  type ActivityId,
  type EntryKind,
  type FeelingId,
  type Visibility,
} from "@/domain/days";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { FeelingSheet } from "./components/FeelingSheet";
import { MediaArt } from "./components/MediaArt";
import { MediaPickerSheet } from "./components/MediaPickerSheet";
import { VisibilityPicker } from "./components/VisibilityPicker";
import { VoicePlayer } from "./components/VoicePlayer";
import { VoiceRecorderSheet } from "./components/VoiceRecorderSheet";
import { useDaysOverview, useEntry, useSaveEntry } from "./useDays";
import { goBack } from "@/navigation/goBack";
import { ENTER, LAYOUT } from "@/theme/transitions";

const MAX_TEXT = 500;

interface Draft {
  kind: EntryKind;
  text: string;
  media: DemoMedia | null;
  mood: FeelingId | null;
  activity: ActivityId | null;
  place: string;
  visibility: Visibility;
}

const EMPTY: Draft = {
  kind: "text",
  text: "",
  media: null,
  mood: null,
  activity: null,
  place: "",
  visibility: "private",
};

function draftOf(e: EntryView): Draft {
  return {
    kind: e.kind,
    text: e.text,
    media: e.media ?? null,
    mood: e.mood ?? null,
    activity: e.activity ?? null,
    place: e.place ?? "",
    visibility: e.visibility,
  };
}

/** The moment's emoji: its feeling, else its activity, else its kind. */
export function emojiFor(d: Pick<Draft, "kind" | "mood" | "activity">): string {
  const mood = FEELINGS.find((f) => f.id === d.mood);
  if (mood !== undefined && (d.kind === "feeling" || d.kind === "text")) return mood.emoji;
  const activity = ACTIVITIES.find((a) => a.id === d.activity);
  if (activity !== undefined && (d.kind === "activity" || d.kind === "text")) return activity.emoji;
  return kindMeta(d.kind).emoji;
}

function toInput(d: Draft, id: string | undefined): EntryInput {
  return {
    ...(id === undefined ? {} : { id }),
    kind: d.kind,
    text: d.text.trim(),
    emoji: emojiFor(d),
    visibility: d.visibility,
    ...(d.media === null ? {} : { media: d.media }),
    ...(d.mood === null ? {} : { mood: d.mood }),
    ...(d.activity === null ? {} : { activity: d.activity }),
    ...(d.place.trim().length === 0 ? {} : { place: d.place.trim() }),
  };
}

function MediaTile({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
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

function DetailRow({
  icon,
  label,
  value,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || onPress === undefined}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ disabled }}
      style={[styles.row, styles.detail, { gap: spacing.md, opacity: disabled ? 0.55 : 1 }]}
    >
      <Icon name={icon} size={19} color={colors.textSecondary} />
      <AppText variant="callout" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="callout" color="textSecondary" numberOfLines={1} style={styles.value}>
        {value}
      </AppText>
      {disabled ? (
        <Icon name="lock" size={15} color={colors.textTertiary} />
      ) : (
        <Icon name="chevron-right" size={16} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

function ComposeForm({
  id,
  initial,
  partnerName,
}: {
  id: string | undefined;
  initial: Draft;
  partnerName: string;
}) {
  const toast = useToast();
  const { colors, radii, spacing, typography, reduceMotion } = useTheme();
  const save = useSaveEntry();
  const [d, setD] = useState<Draft>(initial);
  const [sheet, setSheet] = useState<"media" | "voice" | "feeling" | "leave" | null>(null);
  const [error, setError] = useState<{ n: number } | null>(null);
  const editing = id !== undefined;
  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setError(null);
  };
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const empty = d.text.trim().length === 0 && d.media === null;
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };

  const submit = (draft: Draft, how: "save" | "draft") => {
    if (draft.text.trim().length === 0 && draft.media === null) {
      setError((e) => ({ n: (e?.n ?? 0) + 1 }));
      return;
    }
    save.mutate(toInput(draft, id), {
      onSuccess: (saved) => {
        toast.show(
          how === "draft"
            ? "Kept as a private draft."
            : saved.visibility === "shared"
              ? `Shared with ${partnerName}.`
              : saved.visibility === "afterReveal"
                ? "Saved for when your days meet."
                : "Kept just for you.",
          "success",
        );
        goBack("/days");
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };
  const leave = () => {
    if (dirty) setSheet("leave");
    else goBack("/days");
  };
  const mood = FEELINGS.find((f) => f.id === d.mood);
  const activity = ACTIVITIES.find((a) => a.id === d.activity);
  const feelingValue =
    [mood, activity]
      .filter((x) => x !== undefined)
      .map((x) => `${x.emoji} ${x.label}`)
      .join(" · ") || "Add";

  return (
    <>
      <GlassScreen
        onBack={leave}
        header={
          <AppText variant="headline" style={styles.textCenter}>
            {editing ? "Edit moment" : "New moment"}
          </AppText>
        }
        footer={
          <Button
            label={editing ? "Save changes" : "Save"}
            onPress={() => {
              submit(d, "save");
            }}
            loading={save.isPending}
          />
        }
      >
        <Animated.View {...enter()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, padding: 4 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Kind of moment"
          >
            {ENTRY_KINDS.map((k) => (
              <GlassChip
                key={k.kind}
                leading={k.emoji}
                label={k.label}
                selected={d.kind === k.kind}
                onPress={() => {
                  set({ kind: k.kind });
                }}
              />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.xs }}>
          <TextField
            label="What's happening?"
            placeholder="Coffee, a walk, a thought…"
            large
            rows={4}
            autoFocus={!editing}
            value={d.text}
            onChangeText={(text) => {
              set({ text });
            }}
            maxLength={MAX_TEXT}
            {...(error === null ? {} : { error: "Add a few words or a picture." })}
          />
          {d.text.length > MAX_TEXT - 80 ? (
            <AppText variant="caption" color="textTertiary" style={styles.right}>
              {MAX_TEXT - d.text.length}
            </AppText>
          ) : null}
        </Animated.View>

        <Animated.View {...enter()} layout={LAYOUT}>
          {d.media === null ? (
            <View style={[styles.row, { gap: spacing.sm }]}>
              <MediaTile
                icon="image"
                label="Photo"
                onPress={() => {
                  setSheet("media");
                }}
              />
              <MediaTile
                icon="video"
                label="Video"
                onPress={() => {
                  setSheet("media");
                }}
              />
              <MediaTile
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
                    height={200}
                    radius={radii.xl - 4}
                  />
                )}
                <Pressable
                  onPress={() => {
                    set({
                      media: null,
                      kind:
                        d.kind === "photo" || d.kind === "video" || d.kind === "voice"
                          ? "text"
                          : d.kind,
                    });
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

        <Animated.View {...enter()}>
          <Glass radius={radii.xl} contentStyle={{ paddingHorizontal: spacing.lg }}>
            <DetailRow
              icon="smile"
              label="Feeling"
              value={feelingValue}
              onPress={() => {
                setSheet("feeling");
              }}
            />
            <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
            <View style={[styles.row, styles.detail, { gap: spacing.md }]}>
              <Icon name="pin" size={19} color={colors.textSecondary} />
              <TextInput
                value={d.place}
                onChangeText={(place) => {
                  set({ place });
                }}
                placeholder="Place"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="Place"
                maxLength={60}
                style={[
                  typography.callout,
                  styles.flex,
                  styles.placeInput,
                  { color: colors.textPrimary },
                ]}
              />
            </View>
            <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
            {/* U-11: changing a moment's time is undecided, so the control is shown but locked. */}
            <DetailRow icon="clock" label="Time" value="Now" disabled />
          </Glass>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <VisibilityPicker
            value={d.visibility}
            from={editing ? initial.visibility : null}
            partnerName={partnerName}
            onChange={(visibility) => {
              set({ visibility });
            }}
          />
        </Animated.View>
      </GlassScreen>

      {sheet === "media" ? (
        <MediaPickerSheet
          visible
          onPick={(media) => {
            set({
              media,
              kind:
                media.type === "video"
                  ? "video"
                  : d.kind === "text" || d.kind === "voice" || d.kind === "video"
                    ? "photo"
                    : d.kind,
            });
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
            set({ media, kind: "voice" });
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === "feeling" ? (
        <FeelingSheet
          visible
          mood={d.mood}
          activity={d.activity}
          onDone={(picked) => {
            set(picked);
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      <ActionSheet
        visible={sheet === "leave"}
        title={editing ? "Leave without saving?" : "Leave this moment?"}
        body={editing ? "Your changes won't be kept." : "It isn't saved yet."}
        art={<SideCharacter pose="thinking" size={110} />}
        confirmLabel="Discard"
        destructive
        cancelLabel="Keep editing"
        onCancel={() => {
          setSheet(null);
        }}
        onConfirm={() => {
          setSheet(null);
          goBack("/days");
        }}
      >
        {editing || empty ? null : (
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Keep as private draft"
              variant="secondary"
              onPress={() => {
                setSheet(null);
                submit({ ...d, visibility: "private" }, "draft");
              }}
            />
          </View>
        )}
      </ActionSheet>
    </>
  );
}

export function ComposeScreen({ id }: { id?: string }) {
  const overview = useDaysOverview();
  const existing = useEntry(id ?? null);
  const people = overview.data;
  const loading = people === undefined || (id !== undefined && existing.data === undefined);
  if (loading)
    return (
      <GlassScreen
        onBack={() => {
          goBack("/days");
        }}
      >
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  const entry = existing.data ?? null;
  // Someone else's, gone, or read-only after the reveal: nothing to edit here.
  if (id !== undefined && !entry?.editable)
    return (
      <SideScope side="garnet">
        <GlassScreen
          onBack={() => {
            goBack("/days");
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
  return (
    <SideScope side={people.me.side ?? "garnet"}>
      <View style={styles.fill}>
        <ComposeForm
          id={id}
          initial={entry === null ? EMPTY : draftOf(entry)}
          partnerName={people.partner.name}
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
  right: { textAlign: "right" },
  row: { flexDirection: "row", alignItems: "center" },
  tile: { height: 78, alignItems: "center", justifyContent: "center" },
  detail: { minHeight: 54 },
  value: { maxWidth: "55%" },
  hairline: { height: StyleSheet.hairlineWidth },
  placeInput: { minHeight: 44, paddingVertical: 10 },
  remove: { position: "absolute", top: 12, right: 12 },
  removeInner: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
