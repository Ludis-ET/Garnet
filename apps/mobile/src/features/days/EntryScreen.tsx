/**
 * DAYS-05 · One moment, in its author's colour (P-55): the picture large, the words, the small
 * facts, both local times, and who sees it. Only the author edits, and only until the days meet
 * (§4, U-18 open). Either partner may delete a shared moment (D-11). Missing, deleted or not
 * yours to see all read the same: "This item isn't available here." (ADR-0004).
 */
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { EntryView, HomePerson } from "@/data/repositories/types";
import { kindMeta, type Visibility } from "@/domain/days";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { entryFacts } from "./components/EntryCard";
import { MediaArt } from "./components/MediaArt";
import { VisibilityPicker } from "./components/VisibilityPicker";
import { VoicePlayer } from "./components/VoicePlayer";
import { editEntry } from "./DayScreen";
import { useDaysOverview, useEntry, useRemoveEntry, useSetVisibility } from "./useDays";

function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md, minHeight: 44 }]}>
      <Icon name={icon} size={18} color={colors.textSecondary} />
      <AppText variant="callout" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

function visibilityLine(entry: EntryView, partnerName: string): string {
  if (!entry.mine) return `Shared by ${entry.authorName}`;
  switch (entry.visibility) {
    case "private":
      return "Only you";
    case "afterReveal":
      return "After your days meet";
    case "shared":
      return `Shared with ${partnerName}`;
  }
}

function EntryBody({
  entry,
  me,
  partner,
}: {
  entry: EntryView;
  me: HomePerson;
  partner: HomePerson;
}) {
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const remove = useRemoveEntry();
  const visibility = useSetVisibility();
  const [dialog, setDialog] = useState<"delete" | "visibility" | null>(null);
  const [pick, setPick] = useState<Visibility>(entry.visibility);
  const at = Temporal.Instant.from(entry.at);
  const media = entry.media;
  const kind = kindMeta(entry.kind);
  const author = entry.mine ? me : partner;
  const other = entry.mine ? partner : me;
  const canDelete = entry.mine || entry.visibility === "shared";
  const enter = (i: number) =>
    reduceMotion
      ? {}
      : {
          entering: FadeInDown.delay(i * 60)
            .springify()
            .damping(18),
        };
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };

  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          router.back();
        }}
      >
        {media !== undefined && media.type !== "voice" ? (
          <Animated.View {...enter(0)}>
            <Glass radius={radii.xl + 2} contentStyle={{ padding: spacing.xs }}>
              <MediaArt
                art={media.art}
                {...(media.type === "video" ? { seconds: media.seconds } : {})}
                height={300}
                radius={radii.xl - 2}
                {...(entry.upload === undefined ? {} : { upload: entry.upload })}
              />
            </Glass>
          </Animated.View>
        ) : null}

        <Animated.View {...enter(1)} style={{ gap: spacing.md }}>
          <AppText variant="hero" accessible={false}>
            {entry.emoji}
          </AppText>
          <AppText variant="title" serif>
            {entry.text}
          </AppText>
          <View style={[styles.row, styles.wrap, { gap: spacing.sm }]}>
            {[`${kind.emoji} ${kind.label}`, ...entryFacts(entry)].map((f) => (
              <Glass key={f} radius={radii.pill} shadow={false} contentStyle={styles.chip}>
                <AppText variant="footnote" weight="500">
                  {f}
                </AppText>
              </Glass>
            ))}
          </View>
        </Animated.View>

        {media?.type === "voice" ? (
          <Animated.View {...enter(2)}>
            <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg }}>
              <VoicePlayer seconds={media.seconds} wave={media.wave} />
            </Glass>
          </Animated.View>
        ) : null}

        <Animated.View {...enter(3)}>
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            <View style={[styles.row, { gap: spacing.md, minHeight: 44 }]}>
              <ProfileAvatar
                name={author.name}
                avatar={{ kind: "initials", swatch: entry.mine ? 0 : 1 }}
                side={author.side}
                size={30}
              />
              <AppText variant="callout" weight="600" style={styles.flex}>
                {author.name}
              </AppText>
            </View>
            <InfoRow
              icon="clock"
              text={`${localTimeLabel(at, author.zone)} ${cityForZone(author.zone)} · ${localTimeLabel(at, other.zone)} ${cityForZone(other.zone)}`}
            />
            <InfoRow
              icon={
                entry.visibility === "private"
                  ? "lock"
                  : entry.visibility === "afterReveal"
                    ? "moon"
                    : "heart"
              }
              text={visibilityLine(entry, partner.name)}
            />
          </Glass>
        </Animated.View>

        <Animated.View {...enter(4)} style={{ gap: spacing.sm }}>
          {entry.mine && entry.editable ? (
            <>
              <Button
                label="Edit"
                variant="secondary"
                onPress={() => {
                  editEntry(entry.id);
                }}
              />
              {entry.visibility === "shared" ? null : (
                <Button
                  label="Who sees this"
                  variant="secondary"
                  onPress={() => {
                    setPick(entry.visibility);
                    setDialog("visibility");
                  }}
                />
              )}
            </>
          ) : null}
          {entry.mine && !entry.editable ? (
            <View style={[styles.row, styles.centerRow, { gap: spacing.xs }]}>
              <Icon name="lock" size={14} color={colors.textTertiary} />
              <AppText variant="footnote" color="textTertiary">
                Your days have met, so this stays as it is.
              </AppText>
            </View>
          ) : null}
          {entry.mine ? null : (
            <Button
              label="Save as memory"
              variant="secondary"
              onPress={() => {
                toast.show("Memories are designed next.");
              }}
            />
          )}
          {canDelete ? (
            <Button
              label="Delete"
              variant="text"
              onPress={() => {
                setDialog("delete");
              }}
            />
          ) : null}
        </Animated.View>
      </GlassScreen>

      <ActionSheet
        visible={dialog === "delete"}
        title="Delete this moment?"
        body={
          entry.visibility === "shared"
            ? `It's removed for you and ${entry.mine ? partner.name : entry.authorName}.`
            : "It can't be brought back."
        }
        icon="trash"
        confirmLabel="Delete"
        destructive
        confirming={remove.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          remove.mutate(entry.id, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Deleted.");
              router.back();
            },
            onError,
          });
        }}
      />
      <Sheet
        visible={dialog === "visibility"}
        title="Who sees this"
        onClose={() => {
          setDialog(null);
        }}
        footer={
          <Button
            label="Done"
            loading={visibility.isPending}
            onPress={() => {
              if (pick === entry.visibility) {
                setDialog(null);
                return;
              }
              visibility.mutate(
                { id: entry.id, visibility: pick },
                {
                  onSuccess: (r) => {
                    setDialog(null);
                    toast.show(
                      r.ok
                        ? pick === "shared"
                          ? `Shared with ${partner.name}.`
                          : "Updated."
                        : "Shared moments stay shared.",
                      r.ok ? "success" : "info",
                    );
                  },
                  onError,
                },
              );
            }}
          />
        }
      >
        <VisibilityPicker
          value={pick}
          from={entry.visibility}
          partnerName={partner.name}
          onChange={setPick}
        />
      </Sheet>
    </>
  );
}

export function EntryScreen({ id }: { id: string }) {
  const { spacing } = useTheme();
  const entry = useEntry(id);
  const overview = useDaysOverview();
  const people = overview.data;
  if (entry.data === undefined || people === undefined)
    return (
      <GlassScreen
        tabBar
        onBack={() => {
          router.back();
        }}
      >
        <View style={[styles.grow, styles.center]}>
          <ActivityIndicator accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  if (entry.data === null)
    return (
      <SideScope side="garnet">
        <GlassScreen
          tabBar
          onBack={() => {
            router.back();
          }}
        >
          <Animated.View
            entering={FadeIn}
            style={[styles.grow, styles.center, { gap: spacing.lg }]}
          >
            <GarnetMark size={96} progress={0} dim />
            <AppText variant="callout" color="textSecondary">
              This item isn't available here.
            </AppText>
          </Animated.View>
        </GlassScreen>
      </SideScope>
    );
  const author = entry.data.mine ? people.me : people.partner;
  return (
    <SideScope side={author.side ?? "garnet"}>
      <View style={styles.fill}>
        <EntryBody entry={entry.data} me={people.me} partner={people.partner} />
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
  centerRow: { justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
});
