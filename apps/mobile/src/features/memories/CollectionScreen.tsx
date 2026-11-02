/**
 * MEM-03 · A collection: its cover as a hero with the title in serif over a soft fade, then its
 * memories. Add memories from a checklist; deleting the collection keeps every memory (MEM-09).
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { MemoryTile } from "./components/MemoryTile";
import { openMemory } from "./OurWorldScreen";
import { useCollection, useDeleteCollection, useMemories, useSetInCollection } from "./useMemories";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";

function Collection({ id }: { id: string }) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const data = useCollection(id);
  const all = useMemories();
  const setIn = useSetInCollection();
  const del = useDeleteCollection();
  const [dialog, setDialog] = useState<"add" | "delete" | null>(null);
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  if (data.data === undefined)
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
  if (data.data === null)
    return (
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
    );
  const { collection, memories } = data.data;
  const cover =
    collection.cover !== null && collection.cover.type !== "voice"
      ? collection.cover.art
      : collection.art;
  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          goBack("/our-world");
        }}
      >
        <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
          <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xs }}>
            <MediaArt art={cover} height={240} radius={radii.xl}>
              <LinearGradient colors={["transparent", "rgba(20,10,30,0.55)"]} style={styles.fade} />
              <View style={[styles.heroText, { padding: spacing.lg, gap: 2 }]}>
                <AppText variant="largeTitle" serif style={styles.white}>
                  {collection.title}
                </AppText>
                {collection.description.length === 0 ? null : (
                  <AppText variant="callout" style={styles.white}>
                    {collection.description}
                  </AppText>
                )}
              </View>
            </MediaArt>
          </Glass>
        </Animated.View>
        <View style={[styles.row, { gap: spacing.sm }]}>
          <View style={styles.flex}>
            <Button
              label="Add memories"
              variant="secondary"
              onPress={() => {
                setDialog("add");
              }}
            />
          </View>
          <Pressable
            onPress={() => {
              setDialog("delete");
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete collection"
          >
            <Glass radius={26} contentStyle={styles.round}>
              <Icon name="trash" size={19} color={colors.danger} />
            </Glass>
          </Pressable>
        </View>
        {memories.length === 0 ? (
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            Nothing here yet. Add a memory.
          </AppText>
        ) : (
          <View style={[styles.grid, { gap: spacing.md }]}>
            {memories.map((m) => (
              <Animated.View
                key={m.id}
                style={styles.half}
                {...(reduceMotion
                  ? {}
                  : {
                      entering: ENTER,
                    })}
              >
                <MemoryTile
                  memory={m}
                  tall={false}
                  onPress={() => {
                    openMemory(m.id);
                  }}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </GlassScreen>
      <Sheet
        visible={dialog === "add"}
        title={`Add to “${collection.title}”`}
        onClose={() => {
          setDialog(null);
        }}
      >
        {(all.data ?? []).map((m) => {
          const inIt = m.collections.some((c) => c.id === collection.id);
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                setIn.mutate(
                  { memoryId: m.id, collectionId: collection.id, inIt: !inIt },
                  { onError },
                );
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: inIt }}
              accessibilityLabel={m.title}
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
              <AppText
                variant="callout"
                weight={inIt ? "600" : "500"}
                style={styles.flex}
                numberOfLines={1}
              >
                {m.title}
              </AppText>
              {inIt ? <Icon name="check" size={18} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
      <ActionSheet
        visible={dialog === "delete"}
        title={`Delete “${collection.title}”?`}
        body="The memories stay in your Memories."
        icon="trash"
        confirmLabel="Delete collection"
        destructive
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          del.mutate(collection.id, {
            onSuccess: () => {
              setDialog(null);
              goBack("/our-world");
            },
            onError,
          });
        }}
      />
    </>
  );
}

export function CollectionScreen({ id }: { id: string }) {
  return (
    <SideScope side="garnet">
      <View style={styles.fill}>
        <Collection id={id} />
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
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  half: { width: "48%" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
  heroText: { position: "absolute", left: 0, right: 0, bottom: 0 },
  white: { color: "#FFFFFF" },
  round: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  option: { minHeight: 52, paddingHorizontal: 12 },
});
