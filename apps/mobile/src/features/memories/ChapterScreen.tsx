/**
 * EVT-07, EVT-08 · One chapter of their story (a month since they started): a cover, a title
 * either can rename, gentle optional prompts (favourite moment, photo, something learned,
 * something ahead) where each adds their own line — "Skip" is always there, nothing counts, no
 * scores, no guilt — and the month's memories.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { LinearGradient } from "expo-linear-gradient";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { ChapterDetail } from "@/data/repositories/types";
import { CHAPTER_PROMPTS, type ChapterPromptId } from "@/domain/events";
import { memoryDateLabel } from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useChapter, useReflect, useRenameChapter } from "@/features/events/useEvents";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { MemoryTile } from "./components/MemoryTile";
import { openMemory } from "./OurWorldScreen";
import { goBack } from "@/navigation/goBack";
import { ENTER, EXIT } from "@/theme/transitions";

function Body({ chapter }: { chapter: ChapterDetail }) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const reflect = useReflect();
  const rename = useRenameChapter();
  const [writing, setWriting] = useState<ChapterPromptId | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState(chapter.title);
  const [skipped, setSkipped] = useState<readonly ChapterPromptId[]>([]);
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const range = `${memoryDateLabel(Temporal.PlainDate.from(chapter.from)).replace(/^\w+ /, "")} – ${memoryDateLabel(Temporal.PlainDate.from(chapter.to)).replace(/^\w+ /, "")}`;
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          goBack("/our-world/chapters");
        }}
      >
        <Animated.View {...enter()}>
          <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xs }}>
            <MediaArt art={chapter.art} height={220} radius={radii.xl}>
              <LinearGradient colors={["transparent", "rgba(20,10,30,0.55)"]} style={styles.fade} />
              <View style={[styles.heroText, { padding: spacing.lg }]}>
                <AppText variant="footnote" weight="600" style={styles.white}>
                  CHAPTER {String(chapter.number).padStart(2, "0")}
                  {chapter.current ? " · NOW" : ""}
                </AppText>
                <Pressable
                  onPress={() => {
                    setRenaming(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${chapter.title}. Rename`}
                  style={[styles.row, { gap: spacing.sm }]}
                >
                  <AppText variant="largeTitle" serif style={styles.white}>
                    {chapter.title}
                  </AppText>
                  <Icon name="edit" size={16} color="#FFFFFF" />
                </Pressable>
                <AppText variant="callout" style={styles.white}>
                  {range}
                </AppText>
              </View>
            </MediaArt>
          </Glass>
        </Animated.View>

        {CHAPTER_PROMPTS.filter((p) => !skipped.includes(p.id)).map((p) => {
          const answers = chapter.reflections.find((r) => r.prompt === p.id)?.answers ?? [];
          return (
            <Animated.View key={p.id} {...enter()} exiting={EXIT}>
              <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={[styles.row, { gap: spacing.sm }]}>
                  <AppText variant="title" accessible={false}>
                    {p.emoji}
                  </AppText>
                  <AppText variant="headline" style={styles.flex}>
                    {p.label}
                  </AppText>
                  {answers.length === 0 ? (
                    <Pressable
                      onPress={() => {
                        setSkipped((s) => [...s, p.id]);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Skip ${p.label}`}
                      hitSlop={8}
                    >
                      <AppText variant="footnote" color="textTertiary" weight="600">
                        Skip
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
                {answers.map((a) => (
                  <View key={a.id} style={[styles.row, styles.top, { gap: spacing.sm }]}>
                    <View style={[styles.dot, { backgroundColor: sideColor(a.side) }]} />
                    <View style={styles.flex}>
                      <AppText variant="caption" color="textSecondary" weight="600">
                        {a.mine ? "You" : a.name}
                      </AppText>
                      <AppText variant="callout" serif italic>
                        {a.text}
                      </AppText>
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={() => {
                    setText("");
                    setWriting(p.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add yours: ${p.label}`}
                  style={[styles.row, { gap: spacing.xs }]}
                >
                  <Icon name="plus" size={16} color={colors.accent} />
                  <AppText variant="callout" color="accent" weight="600">
                    Add yours
                  </AppText>
                </Pressable>
              </Glass>
            </Animated.View>
          );
        })}

        <Animated.View {...enter()} style={{ gap: spacing.md }}>
          <AppText variant="title" serif>
            This month
          </AppText>
          {chapter.memories.length === 0 ? (
            <View style={[styles.center, { gap: spacing.sm }]}>
              <CharacterSlot
                character="garnet"
                look={{ mood: "dreamy", occasion: "memory" }}
                size={150}
                aspectRatio={FRAME_ASPECT}
              />
              <AppText variant="callout" color="textSecondary">
                No memories saved this month yet.
              </AppText>
            </View>
          ) : (
            <View style={[styles.grid, { gap: spacing.md }]}>
              {chapter.memories.map((m) => (
                <View key={m.id} style={styles.half}>
                  <MemoryTile
                    memory={m}
                    tall={false}
                    onPress={() => {
                      openMemory(m.id);
                    }}
                  />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </GlassScreen>

      <Sheet
        visible={writing !== null}
        title={CHAPTER_PROMPTS.find((p) => p.id === writing)?.label ?? ""}
        onClose={() => {
          setWriting(null);
        }}
        footer={
          <Button
            label="Add to our chapter"
            disabled={text.trim().length === 0}
            loading={reflect.isPending}
            onPress={() => {
              if (writing === null) return;
              reflect.mutate(
                { month: chapter.month, prompt: writing, text },
                {
                  onSuccess: () => {
                    setWriting(null);
                  },
                  onError,
                },
              );
            }}
          />
        }
      >
        <TextField
          label="Your line"
          placeholder="A sentence is plenty"
          rows={3}
          value={text}
          onChangeText={setText}
          maxLength={280}
          autoFocus
        />
        <AppText variant="footnote" color="textTertiary">
          You'll both see it in this chapter.
        </AppText>
      </Sheet>
      <Sheet
        visible={renaming}
        title="Rename chapter"
        onClose={() => {
          setRenaming(false);
        }}
        footer={
          <Button
            label="Save"
            disabled={title.trim().length === 0}
            onPress={() => {
              rename.mutate(
                { month: chapter.month, title },
                {
                  onSuccess: () => {
                    setRenaming(false);
                  },
                  onError,
                },
              );
            }}
          />
        }
      >
        <TextField label="Title" value={title} onChangeText={setTitle} maxLength={50} autoFocus />
      </Sheet>
    </>
  );
}

export function ChapterScreen({ month }: { month: string }) {
  const chapter = useChapter(month);
  return (
    <SideScope side="garnet">
      <View style={styles.fill}>
        {chapter.data === undefined || chapter.data === null ? (
          <GlassScreen
            onBack={() => {
              goBack("/our-world/chapters");
            }}
          >
            <View style={[styles.grow, styles.center]}>
              {chapter.data === undefined ? (
                <ActivityIndicator accessibilityLabel="Loading" />
              ) : (
                <AppText variant="callout" color="textSecondary">
                  This item isn't available here.
                </AppText>
              )}
            </View>
          </GlassScreen>
        ) : (
          <Body chapter={chapter.data} />
        )}
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
  row: { flexDirection: "row", alignItems: "center" },
  top: { alignItems: "flex-start" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  half: { width: "48%" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  heroText: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 2 },
  white: { color: "#FFFFFF" },
});
