import { type Href, router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { noOutline } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { SearchFilters, SearchKind, SearchResult } from "@/data/repositories/types";
import { useHomeToday } from "@/features/home/useHome";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import {
  useClearSearches,
  useForgetSearch,
  useRecentSearches,
  useRememberSearch,
  useSearch,
} from "./useSearch";
import { ENTER } from "@/theme/transitions";

const KINDS: readonly {
  kind: SearchKind;
  label: string;
  icon: IconName;
  emoji: string;
  /** Its own colour for the icon disc (decorative; the label says the kind). */
  tint: string;
  /** Where "Browse" goes. */
  href: "/us/chat" | "/days" | "/moments/open-when" | "/our-world" | "/moments";
}[] = [
  {
    kind: "message",
    label: "Messages",
    icon: "chat",
    emoji: "💬",
    tint: palette.violet500,
    href: "/us/chat",
  },
  {
    kind: "moment",
    label: "Moments",
    icon: "edit",
    emoji: "📝",
    tint: palette.ruby400,
    href: "/days",
  },
  {
    kind: "letter",
    label: "Letters",
    icon: "mail",
    emoji: "💌",
    tint: palette.ruby500,
    href: "/moments/open-when",
  },
  {
    kind: "memory",
    label: "Memories",
    icon: "image",
    emoji: "📸",
    tint: palette.sapphire500,
    href: "/our-world",
  },
  {
    kind: "event",
    label: "Events",
    icon: "calendar",
    emoji: "📅",
    tint: palette.sapphire400,
    href: "/moments",
  },
];

/** Gentle starting points before typing. */
const TRY = ["coffee", "miss me", "birthday", "London", "call"] as const;

/** Waits until typing pauses (no search per keystroke). */
function useDebounced(value: string, ms = 220): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => {
      setV(value);
    }, ms);
    return () => {
      clearTimeout(t);
    };
  }, [value, ms]);
  return v;
}

/** The snippet with the matched words in bold (never colour alone). */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0)
    return (
      <AppText variant="footnote" color="textSecondary">
        {text}
      </AppText>
    );
  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return (
    <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
      {parts.map((p, i) =>
        words.includes(p.toLowerCase()) ? (
          <AppText key={i} variant="footnote" weight="600" color="textPrimary">
            {p}
          </AppText>
        ) : (
          p
        ),
      )}
    </AppText>
  );
}

function dateLabel(at: string, zone: string): string {
  const d = Temporal.Instant.from(at).toZonedDateTimeISO(zone).toPlainDate();
  const today = Temporal.Now.plainDateISO(zone);
  const diff = d.until(today).days;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short" });
}

/** A small capital header over a group. */
function Header({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText
        variant="caption"
        weight="600"
        color="textSecondary"
        accessibilityRole="header"
        style={styles.flex}
      >
        {children.toUpperCase()}
      </AppText>
      {right}
    </View>
  );
}

/**
 * SEARCH-01 · Universal search (prompt 14; glass redesign P-67): one floating glass panel holds
 * the field, Cancel and the filters; nothing has an outline. Before typing: recent searches,
 * a few words to try, and glass tiles to browse each kind. While typing: results grouped by
 * kind, each with its own coloured disc and the match in bold. Sealed letters show only their
 * prompt and a "Sealed" mark; drafts of the partner and deleted things never appear (the
 * repository filters). Searches stay on this device.
 */
export function SearchScreen() {
  const { colors, radii, spacing, typography, reduceMotion } = useTheme();
  const toast = useToast();
  const partner = useHomeToday().data?.partner.name ?? "Partner";
  const zone = useHomeToday().data?.me.zone ?? "UTC";
  const [text, setText] = useState("");
  const [kinds, setKinds] = useState<SearchKind[]>([]);
  const [who, setWho] = useState<SearchFilters["who"]>("both");
  const [clearing, setClearing] = useState(false);
  const query = useDebounced(text);
  const results = useSearch(query, { kinds, who });
  const recent = useRecentSearches();
  const remember = useRememberSearch();
  const forget = useForgetSearch();
  const clear = useClearSearches();
  const typing = text.trim().length > 0;
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };

  const open = (r: SearchResult) => {
    remember.mutate(query);
    router.push(r.href as Href);
  };
  const groups = KINDS.map((k) => ({
    ...k,
    items: (results.data ?? []).filter((r) => r.kind === k.kind),
  })).filter((g) => g.items.length > 0);

  return (
    <GlassScreen wash="none">
      {/* One floating glass panel: the field, Cancel and the filters. */}
      <Glass radius={radii.xl + 6} contentStyle={[styles.panel, { gap: spacing.md }]}>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <View
            style={[
              styles.row,
              styles.field,
              styles.flex,
              { gap: spacing.xs, backgroundColor: colors.glassVeilSoft },
            ]}
          >
            <Icon name="search" size={18} color={colors.accent} />
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => {
                remember.mutate(text);
              }}
              placeholder="Search Garnet"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Search Garnet"
              selectionColor={colors.accent}
              style={[
                styles.input,
                noOutline,
                { color: colors.textPrimary, fontFamily: typography.families.text["400"] },
              ]}
            />
            {typing ? (
              <Pressable
                onPress={() => {
                  setText("");
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
                style={[styles.clear, { backgroundColor: colors.textTertiary }]}
              >
                <Icon name="x" size={11} color={colors.background} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              goBack("/home");
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={8}
          >
            <AppText variant="callout" weight="600" color="accent">
              Cancel
            </AppText>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          style={styles.noGrow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          <GlassChip
            label="All"
            selected={kinds.length === 0}
            onPress={() => {
              setKinds([]);
            }}
          />
          {KINDS.map((k) => (
            <GlassChip
              key={k.kind}
              label={k.label}
              leading={k.emoji}
              role="checkbox"
              selected={kinds.includes(k.kind)}
              onPress={() => {
                setKinds((ks) =>
                  ks.includes(k.kind) ? ks.filter((x) => x !== k.kind) : [...ks, k.kind],
                );
              }}
            />
          ))}
        </ScrollView>
        <Segmented
          label="Whose"
          options={[
            { label: "Both", value: "both" },
            { label: "Mine", value: "me" },
            { label: partner, value: "partner" },
          ]}
          value={who}
          onChange={setWho}
        />
      </Glass>

      {!typing ? (
        <View style={{ gap: spacing.lg }}>
          {(recent.data ?? []).length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Header
                right={
                  <Pressable
                    onPress={() => {
                      setClearing(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear history"
                    hitSlop={8}
                  >
                    <AppText variant="footnote" weight="600" color="accent">
                      Clear history
                    </AppText>
                  </Pressable>
                }
              >
                Recent
              </Header>
              <Glass radius={radii.xl} contentStyle={{ paddingVertical: spacing.xs }}>
                {(recent.data ?? []).map((q) => (
                  <View key={q} style={[styles.row, styles.recent]}>
                    <Pressable
                      onPress={() => {
                        setText(q);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Search ${q}`}
                      style={[styles.row, styles.flex, { gap: spacing.sm }]}
                    >
                      <Icon name="clock" size={16} color={colors.textTertiary} />
                      <AppText variant="body">{q}</AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        forget.mutate(q);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${q}`}
                      hitSlop={10}
                    >
                      <Icon name="x" size={15} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ))}
              </Glass>
            </View>
          ) : null}

          <View style={{ gap: spacing.xs }}>
            <Header>Try</Header>
            <View style={[styles.wrap, { gap: spacing.xs }]}>
              {TRY.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setText(t);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${t}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
                >
                  <Glass radius={radii.pill} shadow={false} contentStyle={styles.try}>
                    <AppText variant="callout" color="textSecondary">
                      {t}
                    </AppText>
                  </Glass>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Header>Browse</Header>
            <View style={[styles.wrap, styles.between, { rowGap: spacing.sm }]}>
              {KINDS.map((k) => (
                <Animated.View key={k.kind} {...enter()} style={styles.browse}>
                  <Pressable
                    onPress={() => {
                      router.push(k.href);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${k.label}`}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
                  >
                    <Glass
                      radius={radii.xl}
                      contentStyle={[styles.browseInner, { gap: spacing.sm }]}
                    >
                      <View style={[styles.disc, { backgroundColor: k.tint }]}>
                        <Icon name={k.icon} size={17} color="#FFFFFF" />
                      </View>
                      <AppText variant="callout" weight="600">
                        {k.label}
                      </AppText>
                    </Glass>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </View>

          <View style={[styles.row, styles.centerRow, { gap: 6 }]}>
            <Icon name="lock" size={12} color={colors.textTertiary} />
            <AppText variant="caption" color="textTertiary">
              Searches stay on this device. Sealed letters show only their prompt.
            </AppText>
          </View>
        </View>
      ) : results.data === undefined ? (
        <ActivityIndicator accessibilityLabel="Searching" />
      ) : groups.length === 0 ? (
        <Glass radius={radii.xl} contentStyle={[styles.empty, { gap: spacing.xs }]}>
          <AppText variant="largeTitle" accessible={false}>
            🔍
          </AppText>
          <AppText variant="headline">Nothing found</AppText>
          <AppText variant="callout" color="textSecondary" accessibilityLiveRegion="polite">
            Try another word or filter.
          </AppText>
        </Glass>
      ) : (
        <View style={{ gap: spacing.lg }} accessibilityLiveRegion="polite">
          {groups.map((g) => (
            <Animated.View key={g.kind} {...enter()} style={{ gap: spacing.xs }}>
              <Header>{g.label}</Header>
              <Glass radius={radii.xl} contentStyle={{ paddingVertical: spacing.xs }}>
                {g.items.map((r) => (
                  <Pressable
                    key={`${r.kind}-${r.id}`}
                    onPress={() => {
                      open(r);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.title}${r.sealed ? ", sealed" : ""}. ${dateLabel(r.at, zone)}`}
                    style={({ pressed }) => [
                      styles.result,
                      {
                        gap: spacing.md,
                        backgroundColor: pressed ? colors.glassHighlight : undefined,
                      },
                    ]}
                  >
                    <View style={[styles.disc, { backgroundColor: g.tint }]}>
                      <Icon name={g.icon} size={17} color="#FFFFFF" />
                    </View>
                    <View style={[styles.flex, { gap: 2 }]}>
                      <View style={[styles.row, { gap: spacing.xs }]}>
                        <AppText
                          variant="callout"
                          weight="600"
                          numberOfLines={1}
                          style={styles.shrink}
                        >
                          {r.title}
                        </AppText>
                        {r.sealed ? (
                          <View style={[styles.sealed, { backgroundColor: colors.accentSoft }]}>
                            <Icon name="lock" size={10} color={colors.accent} />
                            <AppText variant="caption" weight="600" color="accent">
                              Sealed
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                      {r.snippet === null ? null : <Highlighted text={r.snippet} query={query} />}
                    </View>
                    <AppText variant="caption" color="textTertiary">
                      {dateLabel(r.at, zone)}
                    </AppText>
                  </Pressable>
                ))}
              </Glass>
            </Animated.View>
          ))}
        </View>
      )}

      <ActionSheet
        visible={clearing}
        title="Clear search history?"
        body="This clears recent searches on this device."
        icon="trash"
        confirmLabel="Clear"
        destructive
        onCancel={() => {
          setClearing(false);
        }}
        onConfirm={() => {
          setClearing(false);
          clear.mutate(undefined, {
            onSuccess: () => {
              toast.show("Search history cleared.");
            },
          });
        }}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  // A sideways row must not stretch to fill the column (react-native-web).
  noGrow: { flexGrow: 0 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  between: { justifyContent: "space-between" },
  centerRow: { justifyContent: "center" },
  panel: { padding: 12 },
  field: { paddingHorizontal: 14, height: 46, borderRadius: 999 },
  input: { flex: 1, fontSize: 17, paddingVertical: 0, height: 46 },
  clear: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  recent: { paddingHorizontal: 14, minHeight: 48 },
  try: { paddingHorizontal: 14, paddingVertical: 8 },
  browse: { width: "48.5%" },
  browseInner: { flexDirection: "row", alignItems: "center", padding: 14 },
  empty: { alignItems: "center", padding: 28 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sealed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
