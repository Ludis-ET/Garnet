import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Segmented } from "@/components/ui/Segmented";
import type { ChatSticker } from "@/domain/chat";
import { artworkFiles } from "@/features/figures/art/artworkFiles";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { MOODS, type Mood } from "@/features/figures/types";
import { EmojiBoard } from "@/features/emoji/EmojiBoard";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER, POP } from "@/theme/transitions";

/** One row of favourites, always one tap away above the composer. */
export const QUICK_EMOJI = ["❤️", "🥰", "😂", "🥺", "😘", "🫂", "✨", "🙏"] as const;

const CHARACTERS: readonly { id: ChatSticker["character"]; name: string }[] = [
  { id: "garnet", name: "Garnet" },
  { id: "ruby", name: "Ruby" },
  { id: "sapphire", name: "Sapphire" },
];

/** The stickers there are images for (the owner's files), else every mood as a placeholder. */
export function stickersFor(character: ChatSticker["character"]): readonly Mood[] {
  const owned = MOODS.filter((m) => artworkFiles[`${character}-${m}`] !== undefined);
  return owned.length > 0 ? owned : MOODS;
}

/**
 * The expression panel under the composer (P-62, P-63): the full emoji board laid out like the
 * iPhone's (it takes the keyboard's place, with ABC and delete keys), or stickers of Garnet, Ruby
 * and Sapphire cut from the owner's images (P-44; nothing drawn by agents). Emoji go into the
 * message; a sticker sends at once. Decorative art is labelled by name and mood for screen
 * readers.
 */
export function ExpressionPanel({
  onEmoji,
  onBackspace,
  onKeyboard,
  onSticker,
  mySide,
}: {
  onEmoji: (emoji: string) => void;
  onBackspace: () => void;
  onKeyboard: () => void;
  onSticker: (sticker: ChatSticker) => void;
  mySide: ChatSticker["character"];
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [who, setWho] = useState<ChatSticker["character"]>(mySide);
  return (
    <Animated.View
      {...(reduceMotion ? {} : { entering: ENTER })}
      style={{ paddingTop: spacing.sm }}
    >
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.md, gap: spacing.sm }}>
        <Segmented
          label="Expressions"
          options={[
            { label: "Emoji", value: "emoji" },
            { label: "Stickers", value: "stickers" },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "emoji" ? (
          <EmojiBoard bare onPick={onEmoji} onBackspace={onBackspace} onKeyboard={onKeyboard} />
        ) : (
          <Animated.View entering={ENTER} style={{ gap: spacing.sm }}>
            <View accessibilityRole="tablist" style={[styles.row, { gap: spacing.xs }]}>
              {CHARACTERS.map((c) => {
                const on = c.id === who;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setWho(c.id);
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={`${c.name} stickers`}
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.who,
                      {
                        borderRadius: radii.pill,
                        backgroundColor: on ? colors.accentSoft : colors.glassVeilSoft,
                        borderColor: on ? colors.accent : colors.glassRimEnd,
                      },
                    ]}
                  >
                    <View style={styles.whoFace}>
                      <CharacterSlot
                        character={c.id}
                        look={{ mood: "happy", occasion: "everyday" }}
                        size={64}
                        aspectRatio={FRAME_ASPECT}
                      />
                    </View>
                    <AppText
                      variant="caption"
                      weight={on ? "600" : "500"}
                      color={on ? "textPrimary" : "textSecondary"}
                    >
                      {c.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View key={who} style={styles.stickerGrid}>
                {stickersFor(who).map((mood) => (
                  <Animated.View
                    key={mood}
                    {...(reduceMotion
                      ? {}
                      : {
                          entering: POP,
                        })}
                    style={styles.sticker}
                  >
                    <Pressable
                      onPress={() => {
                        onSticker({ character: who, mood });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Send ${who} ${mood} sticker`}
                      style={({ pressed }) => [
                        styles.stickerBtn,
                        {
                          borderRadius: radii.lg,
                          backgroundColor: pressed ? colors.accentSoft : colors.glassVeilSoft,
                          transform: [{ scale: pressed ? 0.9 : 1 }],
                        },
                      ]}
                    >
                      <CharacterSlot
                        character={who}
                        look={{ mood, occasion: "everyday" }}
                        size={86}
                        aspectRatio={FRAME_ASPECT}
                      />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  scroll: { maxHeight: 250 },
  who: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 10,
    height: 40,
    overflow: "hidden",
  },
  whoFace: { width: 34, height: 40, overflow: "hidden", alignItems: "center", paddingTop: 2 },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  sticker: { width: "23.5%" },
  stickerBtn: { alignItems: "center", justifyContent: "flex-end", height: 96, overflow: "hidden" },
});
