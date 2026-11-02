/**
 * MEM-05 memory detail, MEM-06 viewer, MEM-09 remove vs delete. The picture full width (tap to
 * open the viewer), the title in serif, date and place, the story, who added it, and its
 * collections. "Remove from a collection" keeps the memory; "Delete" removes it for both of
 * you. Who deleted a memory is never shown (U-16). In the author's colour (P-55).
 */
import { router } from "expo-router";
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
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { MemoryView } from "@/data/repositories/types";
import { memoryDateLabel } from "@/domain/memories";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { useCollections, useMemory, useRemoveMemory, useSetInCollection } from "./useMemories";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

function MemoryBody({ memory }: { memory: MemoryView }) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const { openMedia } = useMediaPlayer();
  const collections = useCollections();
  const setIn = useSetInCollection();
  const remove = useRemoveMemory();
  const [dialog, setDialog] = useState<"collections" | "delete" | null>(null);
  const media = memory.media;
  const date = Temporal.PlainDate.from(memory.date);
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          goBack("/our-world");
        }}
      >
        {media !== null && media.type !== "voice" ? (
          <Animated.View {...enter()}>
            <Pressable
              onPress={() => {
                openMedia({
                  type: media.type,
                  art: media.art,
                  caption: memory.title,
                  ...(media.type === "video" ? { seconds: media.seconds } : {}),
                  authorName: memory.authorName,
                });
              }}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Open ${media.type}`}
            >
              <Glass radius={radii.xl + 2} contentStyle={{ padding: spacing.xs }}>
                <MediaArt
                  art={media.art}
                  {...(media.type === "video" ? { seconds: media.seconds } : {})}
                  height={320}
                  radius={radii.xl - 2}
                />
              </Glass>
            </Pressable>
          </Animated.View>
        ) : null}
        {media?.type === "voice" ? (
          <Animated.View {...enter()}>
            <Glass
              radius={radii.xl}
              tint={memory.authorSide ?? "garnet"}
              contentStyle={{ padding: spacing.lg }}
            >
              <VoicePlayer seconds={media.seconds} wave={media.wave} />
            </Glass>
          </Animated.View>
        ) : null}

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <AppText variant="largeTitle" serif>
            {memory.title}
          </AppText>
          <AppText variant="callout" color="textSecondary">
            {memoryDateLabel(date)}
            {memory.place.length > 0 ? ` · ${memory.place}` : ""}
          </AppText>
          {memory.story.length > 0 ? (
            <AppText variant="body" serif italic={media === null}>
              {memory.story}
            </AppText>
          ) : null}
        </Animated.View>

        <Animated.View {...enter()}>
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={[styles.row, { gap: spacing.md }]}>
              <ProfileAvatar
                name={memory.authorName}
                avatar={{ kind: "initials", swatch: memory.mine ? 0 : 1 }}
                side={memory.authorSide}
                size={34}
              />
              <AppText variant="callout" style={styles.flex}>
                Added by {memory.mine ? "you" : memory.authorName}
              </AppText>
            </View>
            {memory.collections.length === 0 && memory.tags.length === 0 ? null : (
              <View style={[styles.wrap, { gap: spacing.sm }]}>
                {memory.collections.map((c) => (
                  <GlassChip
                    key={c.id}
                    leading="📁"
                    label={c.title}
                    selected={false}
                    onPress={() => {
                      router.push({ pathname: "/our-world/collection/[id]", params: { id: c.id } });
                    }}
                  />
                ))}
                {memory.tags.map((t) => (
                  <View
                    key={t}
                    style={[
                      styles.tag,
                      { backgroundColor: colors.glassVeilSoft, borderColor: colors.glassRimEnd },
                    ]}
                  >
                    <AppText variant="caption" color="textSecondary">
                      #{t}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Glass>
        </Animated.View>

        <Animated.View {...enter()} style={{ gap: spacing.sm }}>
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => {
              router.push({ pathname: "/our-world/memory-new", params: { id: memory.id } });
            }}
          />
          <Button
            label="Collections"
            variant="secondary"
            onPress={() => {
              setDialog("collections");
            }}
          />
          <Button
            label="Delete memory"
            variant="text"
            onPress={() => {
              setDialog("delete");
            }}
          />
        </Animated.View>
      </GlassScreen>

      <Sheet
        visible={dialog === "collections"}
        title="Collections"
        onClose={() => {
          setDialog(null);
        }}
      >
        <AppText variant="footnote" color="textSecondary">
          Removing it from a collection keeps it in your Memories.
        </AppText>
        <View style={{ gap: spacing.xs }}>
          {(collections.data ?? []).map((c) => {
            const inIt = memory.collections.some((x) => x.id === c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setIn.mutate(
                    { memoryId: memory.id, collectionId: c.id, inIt: !inIt },
                    {
                      onSuccess: () => {
                        toast.show(inIt ? `Removed from “${c.title}”.` : `Added to “${c.title}”.`);
                      },
                      onError,
                    },
                  );
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: inIt }}
                accessibilityLabel={c.title}
                style={[
                  styles.row,
                  styles.option,
                  {
                    gap: spacing.md,
                    borderRadius: radii.md,
                    backgroundColor: inIt ? colors.accentSoft : "transparent",
                  },
                ]}
              >
                <View style={styles.thumb}>
                  <MediaArt
                    art={c.cover !== null && c.cover.type !== "voice" ? c.cover.art : c.art}
                    height={40}
                    radius={10}
                  />
                </View>
                <AppText variant="callout" weight={inIt ? "600" : "500"} style={styles.flex}>
                  {c.title}
                </AppText>
                {inIt ? <Icon name="check" size={18} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
      <ActionSheet
        visible={dialog === "delete"}
        title="Delete this memory?"
        body="It will be removed for both of you, including its photos and collection links. Copies saved outside Garnet aren't affected."
        icon="trash"
        confirmLabel="Delete"
        destructive
        confirming={remove.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          remove.mutate(memory.id, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Deleted.");
              goBack("/our-world");
            },
            onError,
          });
        }}
      />
    </>
  );
}

export function MemoryScreen({ id }: { id: string }) {
  const memory = useMemory(id);
  if (memory.data === undefined)
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
  if (memory.data === null)
    return (
      <SideScope side="garnet">
        <GlassScreen
          onBack={() => {
            goBack("/our-world");
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
    <SideScope side={memory.data.authorSide ?? "garnet"}>
      <View style={styles.fill}>
        <MemoryBody memory={memory.data} />
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
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  option: { minHeight: 56, paddingHorizontal: 10 },
  thumb: { width: 40 },
});
