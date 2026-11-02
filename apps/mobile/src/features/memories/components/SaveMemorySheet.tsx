import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Temporal } from "temporal-polyfill";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/GlassChip";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { useTheme } from "@/theme/ThemeProvider";
import { useCollections, useSaveMemory } from "../useMemories";

/**
 * MEM-08 · Save as memory, from a moment in Days or a message in chat. Always an explicit
 * choice (§23): nothing becomes a memory on its own. Title, a few words and collections, then
 * "Saved to Memories."
 */
export function SaveMemorySheet({
  media,
  title: initialTitle,
  story: initialStory,
  date,
  place = "",
  onSaved,
  onClose,
}: {
  media: DemoMedia | null;
  title: string;
  story: string;
  /** ISO date of the moment. */
  date: string;
  place?: string;
  /** Called once it's saved (chat marks the message). */
  onSaved?: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { radii, spacing } = useTheme();
  const collections = useCollections();
  const save = useSaveMemory();
  const [title, setTitle] = useState(initialTitle);
  const [story, setStory] = useState(initialStory);
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const [error, setError] = useState(false);
  return (
    <Sheet
      visible
      onClose={onClose}
      title="Save as memory"
      peek={<SideCharacter pose="holdingCrystal" size={100} />}
      footer={
        <Button
          label="Save memory"
          loading={save.isPending}
          onPress={() => {
            if (title.trim().length === 0) {
              setError(true);
              return;
            }
            save.mutate(
              {
                title,
                story,
                date: Temporal.PlainDate.from(date).toString(),
                place,
                media,
                tags: [],
                collectionIds: [...chosen],
              },
              {
                onSuccess: () => {
                  toast.show("Saved to Memories.", "success");
                  onSaved?.();
                  onClose();
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
      {media === null ? null : media.type === "voice" ? (
        <VoicePlayer seconds={media.seconds} wave={media.wave} />
      ) : (
        <MediaArt
          art={media.art}
          {...(media.type === "video" ? { seconds: media.seconds } : {})}
          height={170}
          radius={radii.lg}
        />
      )}
      <TextField
        label="Title"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setError(false);
        }}
        maxLength={80}
        {...(error ? { error: "Give it a name." } : {})}
      />
      <TextField
        label="A few words"
        value={story}
        onChangeText={setStory}
        rows={2}
        maxLength={400}
      />
      {collections.data === undefined || collections.data.length === 0 ? null : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" weight="500">
            Add to
          </AppText>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {collections.data.map((c) => (
              <GlassChip
                key={c.id}
                role="checkbox"
                label={c.title}
                selected={chosen.includes(c.id)}
                onPress={() => {
                  setChosen((x) => (x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id]));
                }}
              />
            ))}
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap" },
});
