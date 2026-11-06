import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Temporal } from "temporal-polyfill";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { noOutline } from "@/components/ui/TextField";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import type { EntryInput } from "@/data/repositories/types";
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
import { dayMoment } from "@/domain/companion";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, EXIT, LAYOUT, SHEET } from "@/theme/transitions";

const MAX = 280;

/** A prompt that changes with the time of day, so the field never feels like a blank form. */
const PROMPT = {
  morning: "How's the morning going?",
  day: "What's happening right now?",
  evening: "How was your day?",
  night: "A little thought before sleep…",
} as const;

type Panel = "feeling" | "activity" | "place" | null;

export interface LoggedMoment {
  input: EntryInput;
  /** Kept unsaved by closing: saved as a private draft (never lost, §5). */
  draft: boolean;
}

function Tool({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.tool,
        {
          backgroundColor: active ? colors.accentSoft : colors.glassVeilSoft,
          borderColor: active ? colors.accent : colors.glassRimEnd,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}
    >
      <Icon name={icon} size={20} color={active ? colors.accent : colors.textSecondary} />
    </Pressable>
  );
}

/**
 * HOME-03 · Log a moment, redesigned as a mini composer (P-62). A big writing field whose prompt
 * follows the time of day; kind chips; a tool tray for a photo or video, a voice note, a feeling,
 * an activity and a place; attached things as removable glass chips; then three explicit
 * choices: Share with Noah, After our days meet, Keep private (day-log rule 2: nothing is shared
 * without a tap). Dragging down or tapping outside keeps typed words as a private draft (§5).
 * Media and voice are simulated.
 */
export function LogSheet({
  visible,
  partnerName,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  partnerName: string;
  saving: boolean;
  onSave: (moment: LoggedMoment) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing, typography, motion, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<EntryKind>("text");
  const [media, setMedia] = useState<DemoMedia | null>(null);
  const [mood, setMood] = useState<FeelingId | null>(null);
  const [activity, setActivity] = useState<ActivityId | null>(null);
  const [place, setPlace] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [picker, setPicker] = useState<"media" | "voice" | null>(null);
  const drag = useSharedValue(0);
  const prompt = PROMPT[dayMoment(Temporal.Now.instant(), Temporal.Now.timeZoneId())];

  const hasContent = text.trim().length > 0 || media !== null;
  const emoji =
    FEELINGS.find((f) => f.id === mood)?.emoji ??
    ACTIVITIES.find((a) => a.id === activity)?.emoji ??
    kindMeta(kind).emoji;
  const input = (visibility: Visibility): EntryInput => ({
    kind,
    text: text.trim().length > 0 ? text : media?.type === "voice" ? "Voice note" : "A picture",
    emoji,
    visibility,
    ...(media === null ? {} : { media }),
    ...(mood === null ? {} : { mood }),
    ...(activity === null ? {} : { activity }),
    ...(place.trim().length === 0 ? {} : { place: place.trim() }),
  });
  const reset = () => {
    setText("");
    setKind("text");
    setMedia(null);
    setMood(null);
    setActivity(null);
    setPlace("");
    setPanel(null);
  };
  const close = () => {
    drag.set(0);
    if (hasContent) onSave({ input: input("private"), draft: true });
    else onClose();
    reset();
  };
  const save = (visibility: Visibility) => {
    onSave({ input: input(visibility), draft: false });
    reset();
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.set(Math.max(0, drag.get() + e.changeY));
    })
    .onEnd((e) => {
      if (drag.get() > 120 || e.velocityY > 900) scheduleOnRN(close);
      else drag.set(withSpring(0, motion.spring.smooth));
    });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() }] }));
  const toggle = (p: Panel) => {
    setPanel((x) => (x === p ? null : p));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View entering={ENTER} style={[styles.fill, { backgroundColor: colors.scrim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          {/* box-none: this full-screen layer must let a tap above the sheet reach the scrim. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.end}
            pointerEvents="box-none"
          >
            <Animated.View
              {...(reduceMotion ? {} : { entering: SHEET })}
              accessibilityViewIsModal
              style={[
                styles.sheet,
                { padding: spacing.sm, paddingBottom: insets.bottom + spacing.sm },
              ]}
            >
              <Animated.View style={sheetStyle}>
                <View pointerEvents="none" style={styles.peek}>
                  <SideCharacter pose="writingLetter" size={108} />
                </View>
                <Glass radius={radii.xl + 4}>
                  <GestureDetector gesture={pan}>
                    <View style={styles.handleArea} accessibilityLabel="Drag down to close">
                      <View style={[styles.grabber, { backgroundColor: colors.glassRimEnd }]} />
                    </View>
                  </GestureDetector>
                  <ScrollView
                    style={{ maxHeight: height * 0.78 }}
                    contentContainerStyle={{
                      paddingHorizontal: spacing.lg,
                      paddingBottom: spacing.lg,
                      gap: spacing.md,
                    }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing.xs, padding: 2 }}
                      accessibilityRole="radiogroup"
                      accessibilityLabel="Kind of moment"
                    >
                      {ENTRY_KINDS.map((k) => (
                        <GlassChip
                          key={k.kind}
                          leading={k.emoji}
                          label={k.label}
                          selected={kind === k.kind}
                          onPress={() => {
                            setKind(k.kind);
                            if (k.kind === "photo" || k.kind === "video") setPicker("media");
                            if (k.kind === "voice") setPicker("voice");
                            if (k.kind === "feeling") setPanel("feeling");
                            if (k.kind === "activity") setPanel("activity");
                            if (k.kind === "place") setPanel("place");
                          }}
                        />
                      ))}
                    </ScrollView>

                    {/* The writing well: glass, no outline, serif-free and roomy. */}
                    <View
                      style={[
                        styles.well,
                        {
                          borderRadius: radii.lg,
                          backgroundColor: colors.glassVeilSoft,
                          borderColor: colors.glassRimStart,
                        },
                      ]}
                    >
                      <View style={[styles.row, { gap: spacing.sm }]}>
                        <AppText variant="title" accessible={false}>
                          {emoji}
                        </AppText>
                        <TextInput
                          value={text}
                          onChangeText={setText}
                          placeholder={prompt}
                          placeholderTextColor={colors.textTertiary}
                          accessibilityLabel="A small moment"
                          autoFocus
                          multiline
                          maxLength={MAX}
                          selectionColor={colors.accent}
                          style={[
                            styles.input,
                            noOutline,
                            {
                              color: colors.textPrimary,
                              fontFamily: typography.families.text["500"],
                            },
                          ]}
                        />
                      </View>
                      {text.length > MAX - 60 ? (
                        <AppText
                          variant="caption"
                          color={text.length >= MAX ? "danger" : "textTertiary"}
                          style={styles.right}
                        >
                          {MAX - text.length}
                        </AppText>
                      ) : null}
                    </View>

                    {/* What's attached, as removable chips. */}
                    {media === null ? null : (
                      <Animated.View entering={ENTER} exiting={EXIT}>
                        <Glass
                          radius={radii.lg}
                          shadow={false}
                          contentStyle={{ padding: spacing.xs }}
                        >
                          {media.type === "voice" ? (
                            <View style={{ padding: spacing.sm }}>
                              <VoicePlayer seconds={media.seconds} wave={media.wave} compact />
                            </View>
                          ) : (
                            <MediaArt
                              art={media.art}
                              {...(media.type === "video" ? { seconds: media.seconds } : {})}
                              height={140}
                              radius={radii.lg - 2}
                            />
                          )}
                          <Pressable
                            onPress={() => {
                              setMedia(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Remove attachment"
                            hitSlop={8}
                            style={[styles.remove, { backgroundColor: "rgba(10,8,20,0.55)" }]}
                          >
                            <Icon name="x" size={14} color="#FFFFFF" />
                          </Pressable>
                        </Glass>
                      </Animated.View>
                    )}
                    {mood === null && activity === null && place.trim().length === 0 ? null : (
                      <Animated.View layout={LAYOUT} style={[styles.wrap, { gap: spacing.xs }]}>
                        {mood === null ? null : (
                          <GlassChip
                            leading={FEELINGS.find((f) => f.id === mood)?.emoji ?? "💗"}
                            label={`${FEELINGS.find((f) => f.id === mood)?.label ?? ""} ✕`}
                            selected
                            role="checkbox"
                            onPress={() => {
                              setMood(null);
                            }}
                          />
                        )}
                        {activity === null ? null : (
                          <GlassChip
                            leading={ACTIVITIES.find((a) => a.id === activity)?.emoji ?? "✨"}
                            label={`${ACTIVITIES.find((a) => a.id === activity)?.label ?? ""} ✕`}
                            selected
                            role="checkbox"
                            onPress={() => {
                              setActivity(null);
                            }}
                          />
                        )}
                        {place.trim().length === 0 ? null : (
                          <GlassChip
                            leading="📍"
                            label={`${place.trim()} ✕`}
                            selected
                            role="checkbox"
                            onPress={() => {
                              setPlace("");
                            }}
                          />
                        )}
                      </Animated.View>
                    )}

                    {/* The tool tray. */}
                    <View style={[styles.row, styles.spread]}>
                      <Tool
                        icon="image"
                        label="Add a photo or video"
                        active={media !== null && media.type !== "voice"}
                        onPress={() => {
                          setPicker("media");
                        }}
                      />
                      <Tool
                        icon="mic"
                        label="Record a voice note"
                        active={media?.type === "voice"}
                        onPress={() => {
                          setPicker("voice");
                        }}
                      />
                      <Tool
                        icon="smile"
                        label="How you feel"
                        active={panel === "feeling" || mood !== null}
                        onPress={() => {
                          toggle("feeling");
                        }}
                      />
                      <Tool
                        icon="sparkle"
                        label="What you're doing"
                        active={panel === "activity" || activity !== null}
                        onPress={() => {
                          toggle("activity");
                        }}
                      />
                      <Tool
                        icon="pin"
                        label="Where you are"
                        active={panel === "place" || place.length > 0}
                        onPress={() => {
                          toggle("place");
                        }}
                      />
                    </View>

                    {panel === "feeling" || panel === "activity" ? (
                      <Animated.View
                        entering={ENTER}
                        exiting={EXIT}
                        style={[styles.grid, { gap: spacing.xs }]}
                      >
                        {(panel === "feeling" ? FEELINGS : ACTIVITIES).map((x) => {
                          const on = panel === "feeling" ? mood === x.id : activity === x.id;
                          return (
                            <Pressable
                              key={x.id}
                              onPress={() => {
                                if (panel === "feeling") setMood(on ? null : (x.id as FeelingId));
                                else setActivity(on ? null : (x.id as ActivityId));
                              }}
                              accessibilityRole="radio"
                              accessibilityLabel={x.label}
                              accessibilityState={{ checked: on }}
                              style={({ pressed }) => [
                                styles.cell,
                                {
                                  borderRadius: radii.md,
                                  backgroundColor: on ? colors.accentSoft : colors.glassVeilSoft,
                                  borderColor: on ? colors.accent : colors.glassRimEnd,
                                  transform: [{ scale: pressed ? 0.94 : on ? 1.04 : 1 }],
                                },
                              ]}
                            >
                              <AppText variant="headline" accessible={false}>
                                {x.emoji}
                              </AppText>
                              <AppText
                                variant="caption"
                                weight={on ? "600" : "500"}
                                color={on ? "textPrimary" : "textSecondary"}
                              >
                                {x.label}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </Animated.View>
                    ) : null}
                    {panel === "place" ? (
                      <Animated.View
                        entering={ENTER}
                        exiting={EXIT}
                        style={[
                          styles.well,
                          styles.row,
                          {
                            borderRadius: radii.pill,
                            backgroundColor: colors.glassVeilSoft,
                            borderColor: colors.glassRimStart,
                            gap: spacing.sm,
                          },
                        ]}
                      >
                        <Icon name="pin" size={18} color={colors.accent} />
                        <TextInput
                          value={place}
                          onChangeText={setPlace}
                          placeholder="A café, home, the river…"
                          placeholderTextColor={colors.textTertiary}
                          accessibilityLabel="Place"
                          maxLength={60}
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            setPanel(null);
                          }}
                          style={[styles.placeInput, noOutline, { color: colors.textPrimary }]}
                        />
                      </Animated.View>
                    ) : null}

                    {/* Who sees it: always an explicit tap (day-log rule 2). */}
                    <View style={{ gap: spacing.xs }}>
                      <Button
                        label={`Share with ${partnerName}`}
                        onPress={() => {
                          save("shared");
                        }}
                        loading={saving}
                        disabled={!hasContent}
                      />
                      <Button
                        label="After our days meet"
                        variant="secondary"
                        disabled={!hasContent || saving}
                        onPress={() => {
                          save("afterReveal");
                        }}
                      />
                      <Button
                        label="Keep private"
                        variant="text"
                        disabled={!hasContent || saving}
                        onPress={() => {
                          save("private");
                        }}
                      />
                    </View>
                  </ScrollView>
                </Glass>
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
          {picker === "media" ? (
            <MediaPickerSheet
              visible
              onPick={(m) => {
                setMedia(m);
                setKind(m.type === "video" ? "video" : "photo");
                setPicker(null);
              }}
              onVoice={() => {
                setPicker("voice");
              }}
              onClose={() => {
                setPicker(null);
              }}
            />
          ) : null}
          {picker === "voice" ? (
            <VoiceRecorderSheet
              visible
              onSave={(m) => {
                setMedia(m);
                setKind("voice");
                setPicker(null);
              }}
              onClose={() => {
                setPicker(null);
              }}
            />
          ) : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  end: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", maxWidth: 480, alignSelf: "center" },
  handleArea: { alignItems: "center", paddingVertical: 12 },
  peek: { position: "absolute", top: -92, right: 18, zIndex: 2 },
  grabber: { width: 40, height: 5, borderRadius: 3 },
  row: { flexDirection: "row", alignItems: "center" },
  spread: { justifyContent: "space-between" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  well: { paddingHorizontal: 14, paddingVertical: 10 },
  input: {
    flex: 1,
    fontSize: 19,
    lineHeight: 25,
    minHeight: 72,
    maxHeight: 160,
    textAlignVertical: "top",
    paddingVertical: 6,
  },
  placeInput: { flex: 1, fontSize: 16, minHeight: 36 },
  right: { textAlign: "right" },
  tool: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    width: "23.5%",
    aspectRatio: 1.05,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  remove: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
