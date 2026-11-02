/**
 * Our World (MEM-01, MEM-02, MEM-10, EVT-08; redesign P-59): a private archive of their life,
 * Garnet violet. Memories as a calm masonry under serif month headers ("October · Chapter 02"),
 * collections as cover cards, and the chapters of their story. Saving is always explicit (§23);
 * no counts of who added more, no scores (§5).
 */
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { MemoryView } from "@/data/repositories/types";
import {
  memoryDateLabel,
  MEMORY_KINDS,
  monthHeader,
  NO_MEMORY_FILTER,
  type MemoryFilter,
} from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { useCompanions } from "@/features/companions/useCompanions";
import { useChapters } from "@/features/events/useEvents";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { MemoryTile } from "./components/MemoryTile";
import { useCollections, useCreateCollection, useMemories, useStart } from "./useMemories";
import { usePlaces, usePlans, useSongs } from "@/features/together/useTogether";
import { ENTER } from "@/theme/transitions";

export type OurWorldTab = "memories" | "collections" | "chapters";

export function openMemory(id: string) {
  router.push({ pathname: "/our-world/memory/[id]", params: { id } });
}

/** Two columns that balance by height, newest first. */
function Masonry({ memories }: { memories: readonly MemoryView[] }) {
  const { spacing, reduceMotion } = useTheme();
  const cols: [MemoryView[], MemoryView[]] = [[], []];
  const heights: [number, number] = [0, 0];
  memories.forEach((m, i) => {
    const tall = i % 3 === 0;
    const h = m.media === null ? 150 : m.media.type === "voice" ? 130 : tall ? 280 : 210;
    const c = heights[0] <= heights[1] ? 0 : 1;
    cols[c].push(m);
    heights[c] += h;
  });
  return (
    <View style={[styles.row, styles.top, { gap: spacing.md }]}>
      {cols.map((col, ci) => (
        <View key={ci} style={[styles.flex, { gap: spacing.md }]}>
          {col.map((m) => (
            <Animated.View
              key={m.id}
              {...(reduceMotion
                ? {}
                : {
                    entering: ENTER,
                  })}
            >
              <MemoryTile
                memory={m}
                tall={memories.indexOf(m) % 3 === 0}
                onPress={() => {
                  openMemory(m.id);
                }}
              />
            </Animated.View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Timeline({ filter }: { filter: MemoryFilter }) {
  const { spacing } = useTheme();
  const memories = useMemories(filter);
  const start = useStart();
  if (memories.data === undefined || start.data === undefined)
    return <ActivityIndicator accessibilityLabel="Loading" />;
  if (memories.data.length === 0)
    return (
      <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xl }]}>
        <CharacterSlot
          character="garnet"
          pose="holdingCrystal"
          size={190}
          aspectRatio={FRAME_ASPECT}
        />
        <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
          {filter === NO_MEMORY_FILTER
            ? "Your story starts with one memory."
            : "Nothing found. Try another word or filter."}
        </AppText>
      </View>
    );
  const startDate = Temporal.PlainDate.from(start.data);
  const groups: { key: string; header: string; items: MemoryView[] }[] = [];
  for (const m of memories.data) {
    const month = Temporal.PlainDate.from(m.date).toPlainYearMonth();
    const last = groups.at(-1);
    if (last?.key === month.toString()) last.items.push(m);
    else groups.push({ key: month.toString(), header: monthHeader(month, startDate), items: [m] });
  }
  return (
    <View style={{ gap: spacing.xl }}>
      {groups.map((g) => (
        <View key={g.key} style={{ gap: spacing.md }}>
          <AppText variant="title" serif accessibilityRole="header">
            {g.header}
          </AppText>
          <Masonry memories={g.items} />
        </View>
      ))}
    </View>
  );
}

function Collections() {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const collections = useCollections();
  const create = useCreateCollection();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  if (collections.data === undefined) return <ActivityIndicator accessibilityLabel="Loading" />;
  return (
    <>
      <View style={[styles.grid, { gap: spacing.md }]}>
        {collections.data.map((c) => (
          <Animated.View
            key={c.id}
            style={styles.half}
            {...(reduceMotion
              ? {}
              : {
                  entering: ENTER,
                })}
          >
            <Pressable
              onPress={() => {
                router.push({ pathname: "/our-world/collection/[id]", params: { id: c.id } });
              }}
              accessibilityRole="button"
              accessibilityLabel={`${c.title}, ${String(c.count)} ${c.count === 1 ? "memory" : "memories"}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <Glass radius={radii.xl} contentStyle={{ padding: 4 }}>
                <MediaArt
                  art={c.cover !== null && c.cover.type !== "voice" ? c.cover.art : c.art}
                  height={150}
                  radius={radii.xl - 4}
                />
                <View style={{ padding: spacing.sm, gap: 2 }}>
                  <AppText variant="callout" serif numberOfLines={2}>
                    {c.title}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {c.count} {c.count === 1 ? "memory" : "memories"}
                  </AppText>
                </View>
              </Glass>
            </Pressable>
          </Animated.View>
        ))}
        <Pressable
          onPress={() => {
            setAdding(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="New collection"
          style={[
            styles.half,
            styles.newCard,
            { borderRadius: radii.xl, borderColor: colors.accent },
          ]}
        >
          <Icon name="plus" size={26} color={colors.accent} />
          <AppText variant="callout" weight="600" color="accent">
            New collection
          </AppText>
        </Pressable>
      </View>
      <Sheet
        visible={adding}
        title="New collection"
        onClose={() => {
          setAdding(false);
        }}
        footer={
          <Button
            label="Create"
            disabled={title.trim().length === 0}
            loading={create.isPending}
            onPress={() => {
              create.mutate(
                { title, description: about },
                {
                  onSuccess: () => {
                    setAdding(false);
                    setTitle("");
                    setAbout("");
                    toast.show("Collection created.", "success");
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
        <TextField
          label="Name"
          placeholder="Trips, Firsts, Our songs…"
          value={title}
          onChangeText={setTitle}
          maxLength={40}
          autoFocus
        />
        <TextField
          label="About"
          placeholder="A line about it (optional)"
          value={about}
          onChangeText={setAbout}
          maxLength={120}
        />
      </Sheet>
    </>
  );
}

function Chapters() {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const chapters = useChapters();
  if (chapters.data === undefined) return <ActivityIndicator accessibilityLabel="Loading" />;
  return (
    <View style={{ gap: spacing.md }}>
      {chapters.data.map((c) => (
        <Animated.View
          key={c.month}
          {...(reduceMotion
            ? {}
            : {
                entering: ENTER,
              })}
        >
          <Pressable
            onPress={() => {
              router.push({ pathname: "/our-world/chapter/[month]", params: { month: c.month } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Chapter ${String(c.number)}, ${c.title}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Glass radius={radii.xl + 2} contentStyle={{ padding: 4 }}>
              <MediaArt art={c.art} height={130} radius={radii.xl}>
                <View style={[styles.chapterInner, { padding: spacing.lg }]}>
                  <Glass
                    radius={radii.pill}
                    shadow={false}
                    style={styles.self}
                    contentStyle={styles.chapterPill}
                  >
                    <AppText variant="caption" weight="600">
                      Chapter {String(c.number).padStart(2, "0")}
                      {c.current ? " · now" : ""}
                    </AppText>
                  </Glass>
                </View>
              </MediaArt>
              <View style={[styles.row, { padding: spacing.md, gap: spacing.sm }]}>
                <View style={styles.flex}>
                  <AppText variant="headline" serif>
                    {c.title}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {memoryDateLabel(Temporal.PlainDate.from(c.from)).replace(/^\w+ /, "")} –{" "}
                    {memoryDateLabel(Temporal.PlainDate.from(c.to)).replace(/^\w+ /, "")}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textTertiary} />
              </View>
            </Glass>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

function FilterSheet({
  initial,
  onApply,
  onClose,
}: {
  initial: MemoryFilter;
  onApply: (f: MemoryFilter) => void;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const collections = useCollections();
  const [f, setF] = useState(initial);
  return (
    <Sheet
      visible
      title="Find a memory"
      onClose={onClose}
      footer={
        <>
          <Button
            label="Show memories"
            onPress={() => {
              onApply(f);
            }}
          />
          <Button
            label="Clear"
            variant="text"
            onPress={() => {
              setF(NO_MEMORY_FILTER);
            }}
          />
        </>
      }
    >
      <TextField
        label="Search"
        placeholder="Airport, coffee, laugh…"
        value={f.query}
        onChangeText={(query) => {
          setF((x) => ({ ...x, query }));
        }}
        returnKeyType="search"
      />
      <Segmented
        label="Whose memories"
        options={[
          { label: "Both", value: "both" },
          { label: "Mine", value: "me" },
          { label: "Theirs", value: "partner" },
        ]}
        value={f.who}
        onChange={(who) => {
          setF((x) => ({ ...x, who }));
        }}
      />
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {MEMORY_KINDS.map((k) => (
          <GlassChip
            key={k.kind}
            role="checkbox"
            leading={k.emoji}
            label={k.label}
            selected={f.kinds.includes(k.kind)}
            onPress={() => {
              setF((x) => ({
                ...x,
                kinds: x.kinds.includes(k.kind)
                  ? x.kinds.filter((y) => y !== k.kind)
                  : [...x.kinds, k.kind],
              }));
            }}
          />
        ))}
      </View>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {(collections.data ?? []).map((c) => (
          <GlassChip
            key={c.id}
            label={c.title}
            selected={f.collectionId === c.id}
            onPress={() => {
              setF((x) => ({ ...x, collectionId: x.collectionId === c.id ? null : c.id }));
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

/** The storybook hero: the current chapter's cover, the two of you together on it. */
function StoryHero() {
  const { radii, spacing, reduceMotion } = useTheme();
  const chapters = useChapters();
  const current = chapters.data?.find((c) => c.current) ?? chapters.data?.[0];
  const { mySide } = useCompanions();
  if (current === undefined) return null;
  const left = mySide === "sapphire" ? "sapphire" : "ruby";
  const right = left === "ruby" ? "sapphire" : "ruby";
  return (
    <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
      <Pressable
        onPress={() => {
          router.push({ pathname: "/our-world/chapter/[month]", params: { month: current.month } });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Our story. Chapter ${String(current.number)}, ${current.title}. Open`}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Glass radius={radii.xl + 6} contentStyle={{ padding: spacing.xs }}>
          <MediaArt art={current.art} height={200} radius={radii.xl + 2}>
            <LinearGradient
              colors={["rgba(255,255,255,0.0)", "rgba(20,10,30,0.45)"]}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.duo]} pointerEvents="none">
              <CharacterSlot
                character={left}
                look={{ mood: "loving", occasion: "memory" }}
                size={150}
                aspectRatio={FRAME_ASPECT}
              />
              <CharacterSlot
                character={right}
                look={{ mood: "loving", occasion: "memory" }}
                size={158}
                aspectRatio={FRAME_ASPECT}
              />
            </View>
            <View style={[styles.storyText, { padding: spacing.lg, gap: 2 }]}>
              <AppText variant="caption" weight="600" style={styles.white}>
                CHAPTER {String(current.number).padStart(2, "0")}
              </AppText>
              <AppText variant="title" serif style={styles.white}>
                Our story
              </AppText>
              <AppText variant="footnote" style={styles.white}>
                {current.title}
              </AppText>
            </View>
          </MediaArt>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/**
 * WORLD-01 · The rest of your shared world (prompt 13): three glass doors under the story, to
 * When we meet again, Places and your soundtrack, each with how many things it holds.
 */
function WorldDoors() {
  const { radii, spacing, reduceMotion } = useTheme();
  const plans = usePlans().data;
  const places = usePlaces().data;
  const songs = useSongs().data;
  const doors = [
    {
      emoji: "🗺️",
      title: "When we meet again",
      count: (plans ?? []).filter((p) => p.doneAt === null).length,
      unit: "plans",
      href: "/our-world/plans" as const,
    },
    {
      emoji: "📍",
      title: "Places",
      count: places?.length ?? 0,
      unit: "places",
      href: "/our-world/places" as const,
    },
    {
      emoji: "🎵",
      title: "Soundtrack",
      count: songs?.length ?? 0,
      unit: "songs",
      href: "/our-world/soundtrack" as const,
    },
  ];
  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {doors.map((d) => (
        <Animated.View
          key={d.title}
          style={styles.flex}
          {...(reduceMotion
            ? {}
            : {
                entering: ENTER,
              })}
        >
          <Pressable
            onPress={() => {
              router.push(d.href);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${d.title}, ${String(d.count)} ${d.unit}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
          >
            <Glass radius={radii.xl} contentStyle={[styles.door, { gap: 4 }]}>
              <AppText variant="title" accessible={false}>
                {d.emoji}
              </AppText>
              <AppText variant="footnote" weight="600" numberOfLines={2}>
                {d.title}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {d.count} {d.unit}
              </AppText>
            </Glass>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

function OurWorld({ initial }: { initial: OurWorldTab }) {
  const { spacing } = useTheme();
  const [tab, setTab] = useState<OurWorldTab>(initial);
  const [filter, setFilter] = useState<MemoryFilter>(NO_MEMORY_FILTER);
  const [filtering, setFiltering] = useState(false);
  return (
    <GlassScreen tabBar>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <AppText variant="largeTitle" style={styles.flex}>
          Our World
        </AppText>
        <IconButton
          icon="search"
          label="Find a memory"
          onPress={() => {
            setTab("memories");
            setFiltering(true);
          }}
        />
        <IconButton
          icon="plus"
          label="Add a memory"
          onPress={() => {
            router.push("/our-world/memory-new");
          }}
        />
      </View>
      <StoryHero />
      <WorldDoors />
      <Segmented
        label="Our World"
        options={[
          { label: "Memories", value: "memories" },
          { label: "Collections", value: "collections" },
          { label: "Chapters", value: "chapters" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {filter !== NO_MEMORY_FILTER && tab === "memories" ? (
        <View style={styles.self}>
          <GlassChip
            label="Filtered · clear"
            leading="✕"
            selected
            onPress={() => {
              setFilter(NO_MEMORY_FILTER);
            }}
          />
        </View>
      ) : null}
      <Animated.View key={tab} entering={ENTER}>
        {tab === "memories" ? (
          <Timeline filter={filter} />
        ) : tab === "collections" ? (
          <Collections />
        ) : (
          <Chapters />
        )}
      </Animated.View>
      {filtering ? (
        <FilterSheet
          initial={filter}
          onApply={(f) => {
            setFilter(
              f.query.trim() === "" &&
                f.kinds.length === 0 &&
                f.who === "both" &&
                f.collectionId === null
                ? NO_MEMORY_FILTER
                : f,
            );
            setFiltering(false);
          }}
          onClose={() => {
            setFiltering(false);
          }}
        />
      ) : null}
    </GlassScreen>
  );
}

export function OurWorldScreen({ initial = "memories" }: { initial?: OurWorldTab }) {
  return (
    <SideScope side="garnet">
      <OurWorld initial={initial} />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  door: { padding: 12, minHeight: 112, justifyContent: "flex-end" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  top: { alignItems: "flex-start" },
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  self: { alignSelf: "flex-start" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  half: { width: "48%" },
  newCard: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chapterInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  chapterPill: { paddingHorizontal: 12, paddingVertical: 5 },
  duo: { position: "absolute", right: 8, bottom: -6, flexDirection: "row", alignItems: "flex-end" },
  storyText: { position: "absolute", left: 0, bottom: 0, maxWidth: "55%" },
  white: { color: "#FFFFFF" },
});
