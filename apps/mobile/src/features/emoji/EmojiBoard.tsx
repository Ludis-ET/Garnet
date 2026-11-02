import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { noOutline } from "@/components/ui/TextField";
import { useTheme } from "@/theme/ThemeProvider";
import {
  EMOJI_CATEGORIES,
  emojiInfo,
  recentEmoji,
  recordEmoji,
  searchEmoji,
  setPreferredTone,
  usePreferredTones,
  withTone,
  type Emoji,
} from "./emoji";
import { POP } from "@/theme/transitions";

const TABS: readonly { id: string; icon: IconName }[] = [
  { id: "recent", icon: "clock" },
  { id: "people", icon: "smile" },
  { id: "nature", icon: "leaf" },
  { id: "food", icon: "cup" },
  { id: "activity", icon: "ball" },
  { id: "travel", icon: "car" },
  { id: "objects", icon: "bulb" },
  { id: "symbols", icon: "hash" },
  { id: "flags", icon: "flag" },
];
const TONE_NAMES = ["light", "medium-light", "medium", "medium-dark", "dark"] as const;
const TITLE_H = 24;

interface Column {
  key: string;
  cat: number;
  emoji: readonly Emoji[];
}

/**
 * The emoji keyboard (P-63), laid out like the iPhone's and dressed in liquid glass: "Search
 * Emoji" on top, every emoji in pages that scroll sideways under a sticky category title, and a
 * category bar at the bottom (Frequently Used first). Long-press an emoji with skin tones for the
 * five tones; the choice is remembered on this device. Optional ABC (back to the keyboard) and
 * delete keys when it stands in for the keyboard. Emoji are drawn by the phone's own font.
 */
export function EmojiBoard({
  onPick,
  onBackspace,
  onKeyboard,
  rows = 5,
  bare = false,
  selected = [],
}: {
  onPick: (emoji: string) => void;
  /** Shows a delete key (the board replaces the keyboard). */
  onBackspace?: () => void;
  /** Shows an "ABC" key that goes back to the keyboard. */
  onKeyboard?: () => void;
  rows?: number;
  /** No glass pane of its own (when it sits inside one already). */
  bare?: boolean;
  /** Emoji to mark as chosen (a message's reactions). */
  selected?: readonly string[];
}) {
  const { colors, radii, spacing, typography, reduceMotion } = useTheme();
  const tones = usePreferredTones();
  // Frequently Used as it was when the board opened, so the pages never jump under a finger.
  const [recent] = useState(recentEmoji);
  const [width, setWidth] = useState(0);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(recent.length > 0 ? 0 : 1);
  const [toning, setToning] = useState<{ base: Emoji; left: number; top: number } | null>(null);
  const list = useRef<FlatList<Column>>(null);
  const scrollX = useRef(0);
  const cell = width > 0 ? Math.floor(width / 8.4) : 44; // about 8½ columns, like the iPhone

  const categories = useMemo(
    () => [
      { id: "recent", title: "Frequently Used", emoji: recent.map(emojiInfo) },
      ...EMOJI_CATEGORIES,
    ],
    [recent],
  );
  const { columns, starts } = useMemo(() => {
    const cols: Column[] = [];
    const st: number[] = [];
    categories.forEach((c, ci) => {
      st.push(cols.length);
      for (let i = 0; i < c.emoji.length; i += rows) {
        cols.push({ key: `${c.id}-${String(i)}`, cat: ci, emoji: c.emoji.slice(i, i + rows) });
      }
    });
    return { columns: cols, starts: st };
  }, [categories, rows]);
  const results = useMemo(() => searchEmoji(query), [query]);

  const pick = (char: string) => {
    recordEmoji(char);
    onPick(char);
  };
  const shown = (e: Emoji) => (e.tones ? withTone(e.char, tones[e.char] ?? null) : e.char);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    scrollX.current = x;
    const col = Math.floor((x + 2) / cell);
    let cat = 0;
    starts.forEach((s, i) => {
      if (s <= col) cat = i;
    });
    if (cat !== current) setCurrent(cat);
    if (toning !== null) setToning(null);
  };
  const jump = (i: number) => {
    setQuery("");
    setToning(null);
    setCurrent(i);
    list.current?.scrollToOffset({ offset: (starts[i] ?? 0) * cell, animated: false });
  };

  const longPress = (e: Emoji, col: number, row: number) => {
    const left = Math.min(
      Math.max(0, col * cell - scrollX.current - cell * 2.5),
      Math.max(0, width - cell * 6 - 8),
    );
    setToning({ base: e, left, top: TITLE_H + row * cell - cell - 10 });
  };
  const cellOf = (e: Emoji, col: number, row: number) => {
    const char = shown(e);
    return (
      <EmojiCell
        key={e.char}
        char={char}
        name={e.name}
        size={cell}
        tones={e.tones}
        selected={selected.includes(char) || selected.includes(e.char)}
        onPick={pick}
        onLongPress={() => {
          longPress(e, col, row);
        }}
      />
    );
  };

  const body = (
    <View
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
      }}
      style={{ gap: spacing.xs }}
    >
      {/* Search Emoji */}
      <View
        style={[
          styles.search,
          { borderRadius: radii.pill, backgroundColor: colors.glassVeilSoft, gap: spacing.xs },
        ]}
      >
        <Icon name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={(q) => {
            setQuery(q);
            setToning(null);
          }}
          placeholder="Search Emoji"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Search Emoji"
          selectionColor={colors.accent}
          style={[
            styles.searchInput,
            noOutline,
            {
              color: colors.textPrimary,
              fontFamily: typography.families.text["400"],
            },
          ]}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery("");
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Icon name="x" size={15} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {query.trim().length > 0 ? (
        <ScrollView style={{ height: TITLE_H + rows * cell }} keyboardShouldPersistTaps="handled">
          <AppText variant="caption" weight="600" color="textTertiary" style={styles.title}>
            {results.length === 0 ? "No emoji found" : "Results"}
          </AppText>
          <View style={styles.wrap}>
            {results.map((e, i) => cellOf(e, i % 8, Math.floor(i / 8) % rows))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ height: TITLE_H + rows * cell }}>
          <AppText
            variant="caption"
            weight="600"
            color="textTertiary"
            accessibilityRole="header"
            style={styles.title}
          >
            {(categories[current]?.title ?? "").toUpperCase()}
          </AppText>
          {
            <FlatList
              ref={list}
              horizontal
              data={columns}
              keyExtractor={(c) => c.key}
              getItemLayout={(_, index) => ({ length: cell, offset: cell * index, index })}
              initialNumToRender={14}
              maxToRenderPerBatch={16}
              windowSize={5}
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={32}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <View style={{ width: cell }}>
                  {item.emoji.map((e, row) => cellOf(e, index, row))}
                </View>
              )}
            />
          }
          {toning === null ? null : (
            <>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setToning(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Close skin tones"
              />
              <Animated.View
                {...(reduceMotion ? {} : { entering: POP })}
                style={[styles.tones, { left: toning.left, top: Math.max(0, toning.top) }]}
              >
                <Glass radius={radii.lg} contentStyle={styles.toneRow}>
                  {[null, 0, 1, 2, 3, 4].map((t) => {
                    const char = withTone(toning.base.char, t);
                    return (
                      <Pressable
                        key={String(t)}
                        onPress={() => {
                          setPreferredTone(toning.base.char, t);
                          setToning(null);
                          pick(char);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                          t === null
                            ? `${toning.base.name}, default`
                            : `${toning.base.name}, ${TONE_NAMES[t] ?? ""} skin tone`
                        }
                        style={({ pressed }) => [
                          styles.cell,
                          {
                            width: cell,
                            height: cell,
                            borderRadius: cell / 2,
                            backgroundColor: pressed ? colors.accentSoft : undefined,
                          },
                        ]}
                      >
                        <AppText
                          accessible={false}
                          style={{ fontSize: cell * 0.62, lineHeight: cell * 0.82 }}
                        >
                          {char}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </Glass>
              </Animated.View>
            </>
          )}
        </View>
      )}

      {/* The category bar, with ABC and delete when the board stands in for the keyboard. */}
      <View style={[styles.bar, { gap: 2 }]}>
        {onKeyboard === undefined ? null : (
          <Pressable
            onPress={onKeyboard}
            accessibilityRole="button"
            accessibilityLabel="Keyboard"
            style={[styles.key, { borderRadius: radii.md, backgroundColor: colors.glassVeilSoft }]}
          >
            <AppText variant="footnote" weight="600">
              ABC
            </AppText>
          </Pressable>
        )}
        <View accessibilityRole="tablist" style={[styles.tabs, styles.flex]}>
          {TABS.map((t, i) => {
            const on = query.trim().length === 0 && i === current;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  jump(i);
                }}
                accessibilityRole="tab"
                accessibilityLabel={categories[i]?.title ?? t.id}
                accessibilityState={{ selected: on }}
                hitSlop={4}
                style={[styles.tab, on ? { backgroundColor: colors.glassHighlight } : null]}
              >
                <Icon name={t.icon} size={18} color={on ? colors.accent : colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
        {onBackspace === undefined ? null : (
          <Pressable
            onPress={onBackspace}
            accessibilityRole="button"
            accessibilityLabel="Delete"
            style={[styles.key, { borderRadius: radii.md, backgroundColor: colors.glassVeilSoft }]}
          >
            <Icon name="backspace" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );

  if (bare) return body;
  return (
    <Glass radius={radii.xl} contentStyle={{ padding: spacing.sm }}>
      {body}
    </Glass>
  );
}

function EmojiCell({
  char,
  name,
  size,
  tones,
  selected,
  onPick,
  onLongPress,
}: {
  char: string;
  name: string;
  size: number;
  tones: boolean;
  selected: boolean;
  onPick: (char: string) => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        onPick(char);
      }}
      {...(tones ? { onLongPress, accessibilityHint: "Long-press for skin tones" } : {})}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: selected
            ? colors.accentSoft
            : pressed
              ? colors.glassHighlight
              : undefined,
          transform: [{ scale: pressed ? 1.25 : 1 }],
        },
      ]}
    >
      <AppText accessible={false} style={{ fontSize: size * 0.62, lineHeight: size * 0.82 }}>
        {char}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", height: 36, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0, height: 36 },
  title: { height: TITLE_H, paddingTop: 4, paddingLeft: 6, letterSpacing: 0.4 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  cell: { alignItems: "center", justifyContent: "center" },
  tones: { position: "absolute", zIndex: 5 },
  toneRow: { flexDirection: "row", padding: 4 },
  bar: { flexDirection: "row", alignItems: "center", height: 40 },
  tabs: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tab: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  key: { height: 36, minWidth: 48, alignItems: "center", justifyContent: "center" },
});
