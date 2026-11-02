import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextField } from "@/components/ui/TextField";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { notifSpec, renderNotification } from "@/domain/notifications";
import {
  contentReady,
  GENERIC_SURPRISE_TITLE,
  isSongLink,
  revealWords,
  SURPRISE_KINDS,
  type SurpriseContent,
  type SurpriseKind,
  type SurpriseReveal,
} from "@/domain/surprises";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { useEvents } from "@/features/events/useEvents";
import { useHomeToday } from "@/features/home/useHome";
import { NotificationMock } from "@/features/notifications/NotificationMock";
import { LetterPaper } from "@/features/openWhen/components/LetterPaper";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { GiftCapsule } from "./components/GiftCapsule";
import { SurpriseContentView } from "./components/SurpriseContentView";
import { useCreateSurprise } from "./useSurprises";
import { ENTER } from "@/theme/transitions";

const EMPTY: SurpriseContent = { kind: "message", text: "", media: null, song: null };

/** 09:00 in the recipient's zone, a number of days from today there. */
function morningIn(zone: string, days: number): string {
  return Temporal.Now.plainDateISO(zone)
    .add({ days })
    .toZonedDateTime({ timeZone: zone, plainTime: { hour: 9, minute: 0 } })
    .toInstant()
    .toString();
}

/** Days until Saturday in a zone (at least 1). */
function untilWeekend(zone: string): number {
  const dow = Temporal.Now.plainDateISO(zone).dayOfWeek; // 1 Mon … 7 Sun
  return dow >= 6 ? 7 - dow + 6 : 6 - dow;
}

/**
 * SUR-02 to SUR-04 · Create a surprise (prompt 12, Daylight Glass): what's inside (seven kinds,
 * each with its editor), when it opens (right away, a date on both clocks, or one of your
 * events) with an optional safe title, then exactly what the partner will see before and after
 * opening. Nothing inside ever shows before it opens. A failed lock is simulated and calm.
 */
export function SurpriseCreateScreen() {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const toast = useToast();
  const people = useHomeToday().data;
  const events = useEvents().data;
  const create = useCreateSurprise();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [content, setContent] = useState<SurpriseContent>(EMPTY);
  const [picker, setPicker] = useState<"media" | "voice" | null>(null);
  const [reveal, setReveal] = useState<SurpriseReveal>({ type: "now" });
  const [titled, setTitled] = useState(false);
  const [title, setTitle] = useState("");
  const [discard, setDiscard] = useState(false);
  const partner = people?.partner.name ?? "your partner";
  const me = people?.me.name ?? "you";
  const theirZone = people?.partner.zone ?? "UTC";
  const myZone = people?.me.zone ?? "UTC";
  const now = Temporal.Now.instant();
  const shownTitle = titled && title.trim().length > 0 ? title.trim() : GENERIC_SURPRISE_TITLE;
  const songLinkBad =
    content.kind === "song" &&
    (content.song?.link ?? "").length > 0 &&
    !isSongLink(content.song?.link ?? "");

  const setKind = (kind: SurpriseKind) => {
    setContent({
      kind,
      text: content.text,
      media: null,
      song: kind === "song" ? { title: "", link: "" } : null,
    });
  };
  const close = () => {
    if (step > 1 || contentReady(content)) setDiscard(true);
    else goBack("/moments/surprises");
  };
  const lock = () => {
    create.mutate(
      { content, safeTitle: titled ? title : null, reveal },
      {
        onSuccess: () => {
          toast.show(`Locked. ${partner} will see it when it opens 🎁`, "success");
          router.replace("/moments/surprises");
        },
        onError: () => {
          toast.show("Couldn't schedule this yet. Try again.", "error");
        },
      },
    );
  };
  const next =
    step === 1
      ? contentReady(content)
        ? () => {
            setStep(2);
          }
        : null
      : step === 2
        ? () => {
            setStep(3);
          }
        : null;

  const dateChoices = [
    { label: "Tomorrow morning", days: 1 },
    { label: "This weekend", days: untilWeekend(theirZone) },
    { label: "In a week", days: 7 },
    { label: "In a month", days: 30 },
  ];
  const upcoming = (events?.events ?? []).filter((e) => e.next !== null).slice(0, 6);
  const bothClocks = (at: string) => {
    const i = Temporal.Instant.from(at);
    return `${localTimeLabel(i, theirZone)} ${cityForZone(theirZone)} · ${localTimeLabel(i, myZone)} ${cityForZone(myZone)}`;
  };
  const notifText = (() => {
    const spec = notifSpec("surprise");
    return spec === undefined
      ? { title: "Something for you", body: "A surprise is waiting for you." }
      : renderNotification(spec, "full", {
          sender: me,
          safeTitle: titled ? shownTitle : "You have something waiting for you. 🎁",
        });
  })();

  return (
    <GlassScreen
      wash="none"
      onBack={
        step === 1
          ? close
          : () => {
              setStep((s) => (s - 1) as 1 | 2 | 3);
            }
      }
      header={
        <View style={{ gap: 6 }}>
          <AppText variant="caption" weight="600" color="textSecondary" style={styles.center}>
            Step {step} of 3
          </AppText>
          <ProgressBar step={step} total={3} />
        </View>
      }
      headerRight={
        next === null ? (
          <View style={styles.side} />
        ) : (
          <Pressable
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel="Next"
            hitSlop={6}
          >
            <Glass radius={radii.pill} shadow={false} contentStyle={styles.nextPill}>
              <AppText variant="callout" weight="600" color="accent">
                Next
              </AppText>
            </Glass>
          </Pressable>
        )
      }
    >
      {/* SUR-02: what's inside. */}
      {step === 1 ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="largeTitle" serif>
              A surprise for {partner}
            </AppText>
            <AppText variant="callout" color="textSecondary">
              Choose what's inside. It stays hidden until it opens.
            </AppText>
          </View>
          <View accessibilityRole="radiogroup" style={[styles.grid, { rowGap: spacing.sm }]}>
            {SURPRISE_KINDS.map((k) => {
              const on = content.kind === k.kind;
              return (
                <Animated.View
                  key={k.kind}
                  style={styles.third}
                  {...(reduceMotion
                    ? {}
                    : {
                        entering: ENTER,
                      })}
                >
                  <Pressable
                    onPress={() => {
                      setKind(k.kind);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={k.label}
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
                  >
                    <Glass
                      radius={radii.lg}
                      tint={on ? "garnet" : "none"}
                      shadow={on}
                      contentStyle={styles.kind}
                    >
                      <AppText variant="title" accessible={false}>
                        {k.emoji}
                      </AppText>
                      <AppText
                        variant="caption"
                        weight={on ? "600" : "500"}
                        style={styles.center}
                        numberOfLines={2}
                      >
                        {k.label}
                      </AppText>
                    </Glass>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <Animated.View key={content.kind} entering={ENTER} style={{ gap: spacing.md }}>
            {content.kind === "letter" ? (
              <LetterPaper
                body={content.text}
                onChange={(text) => {
                  setContent({ ...content, text });
                }}
                {...(content.paper === undefined ? {} : { paper: content.paper })}
                onPaperChange={(paper) => {
                  setContent({ ...content, paper });
                }}
                to={partner}
                from={me}
                placeholder="Write something they'll find when it opens…"
              />
            ) : null}
            {content.kind === "message" || content.kind === "idea" ? (
              <TextField
                label={content.kind === "idea" ? "An idea for when you meet" : "Your message"}
                value={content.text}
                onChangeText={(text) => {
                  setContent({ ...content, text });
                }}
                rows={5}
                maxLength={1000}
                placeholder={
                  content.kind === "idea"
                    ? "Breakfast by the sea, first morning back"
                    : "Something to smile about"
                }
              />
            ) : null}
            {content.kind === "photo" || content.kind === "video" || content.kind === "voice" ? (
              content.media === null ? (
                <Button
                  label={
                    content.kind === "voice"
                      ? "Record a voice note"
                      : content.kind === "video"
                        ? "Choose a video"
                        : "Choose a photo"
                  }
                  variant="secondary"
                  onPress={() => {
                    setPicker(content.kind === "voice" ? "voice" : "media");
                  }}
                />
              ) : (
                <Glass radius={radii.xl} contentStyle={{ padding: spacing.sm, gap: spacing.sm }}>
                  {content.media.type === "voice" ? (
                    <View style={{ padding: spacing.sm }}>
                      <VoicePlayer seconds={content.media.seconds} wave={content.media.wave} />
                    </View>
                  ) : (
                    <MediaArt
                      art={content.media.art}
                      {...(content.media.type === "video"
                        ? { seconds: content.media.seconds }
                        : {})}
                      height={200}
                      radius={radii.lg}
                    />
                  )}
                  <Button
                    label="Choose another"
                    variant="text"
                    onPress={() => {
                      setContent({ ...content, media: null });
                    }}
                  />
                </Glass>
              )
            ) : null}
            {content.kind === "song" ? (
              <>
                <TextField
                  label="Song title"
                  icon="sparkle"
                  value={content.song?.title ?? ""}
                  onChangeText={(t) => {
                    setContent({ ...content, song: { title: t, link: content.song?.link ?? "" } });
                  }}
                  maxLength={80}
                  placeholder="Our song"
                />
                <TextField
                  label="Link"
                  icon="share"
                  value={content.song?.link ?? ""}
                  onChangeText={(l) => {
                    setContent({ ...content, song: { title: content.song?.title ?? "", link: l } });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://"
                  helper="A link to the song in any music app. Garnet keeps the link, not the audio."
                  {...(songLinkBad ? { error: "Use a full https:// link." } : {})}
                />
              </>
            ) : null}
            {content.kind === "photo" ||
            content.kind === "video" ||
            content.kind === "voice" ||
            content.kind === "song" ? (
              <TextField
                label="A few words (optional)"
                value={content.text}
                onChangeText={(text) => {
                  setContent({ ...content, text });
                }}
                maxLength={300}
              />
            ) : null}
          </Animated.View>

          <Button
            label="Next: when it opens"
            disabled={!contentReady(content)}
            onPress={() => {
              setStep(2);
            }}
          />
        </View>
      ) : null}

      {/* SUR-03: when it opens, and what shows before. */}
      {step === 2 ? (
        <View style={{ gap: spacing.lg }}>
          <AppText variant="largeTitle" serif>
            When should {partner} get it?
          </AppText>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
            {(
              [
                {
                  type: "now",
                  emoji: "✨",
                  title: "Right away",
                  detail: "It's ready the moment you lock it",
                },
                {
                  type: "date",
                  emoji: "📅",
                  title: "On a date",
                  detail: `09:00 in ${cityForZone(theirZone)}, shown on both clocks`,
                },
                {
                  type: "event",
                  emoji: "🎉",
                  title: "On an event",
                  detail: "A birthday, your anniversary or a date you saved",
                },
              ] as const
            ).map((o) => {
              const on = reveal.type === o.type;
              return (
                <Pressable
                  key={o.type}
                  onPress={() => {
                    if (o.type === "now") setReveal({ type: "now" });
                    if (o.type === "date") setReveal({ type: "date", at: morningIn(theirZone, 1) });
                    if (o.type === "event") {
                      const e = upcoming[0];
                      if (e !== undefined && e.next !== null)
                        setReveal({
                          type: "event",
                          title: e.title,
                          at: morningAt(e.next, theirZone),
                        });
                      else toast.show("Add an event in Moments first.");
                    }
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={o.title}
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Glass
                    radius={radii.lg}
                    tint={on ? "garnet" : "none"}
                    shadow={on}
                    contentStyle={[styles.option, { gap: spacing.md }]}
                  >
                    <AppText variant="title" accessible={false}>
                      {o.emoji}
                    </AppText>
                    <View style={[styles.flex, { gap: 2 }]}>
                      <AppText variant="headline">{o.title}</AppText>
                      <AppText variant="footnote" color="textSecondary">
                        {o.detail}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        { backgroundColor: on ? colors.accent : colors.glassVeilSoft },
                      ]}
                    >
                      {on ? <Icon name="check" size={13} color={colors.onAccent} /> : null}
                    </View>
                  </Glass>
                </Pressable>
              );
            })}
          </View>

          {reveal.type === "date" ? (
            <View style={{ gap: spacing.sm }}>
              <ScrollView
                horizontal
                style={styles.noGrow}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.xs }}
              >
                {dateChoices.map((d) => {
                  const at = morningIn(theirZone, d.days);
                  return (
                    <GlassChip
                      key={d.label}
                      label={d.label}
                      selected={reveal.at === at}
                      onPress={() => {
                        setReveal({ type: "date", at });
                      }}
                    />
                  );
                })}
              </ScrollView>
              <AppText variant="footnote" color="textSecondary">
                {revealWords(reveal, now.toString(), theirZone, now)} · {bothClocks(reveal.at)}
              </AppText>
            </View>
          ) : null}
          {reveal.type === "event" ? (
            <View style={{ gap: spacing.sm }}>
              <View style={[styles.wrap, { gap: spacing.xs }]}>
                {upcoming.map((e) => {
                  const at = e.next === null ? null : morningAt(e.next, theirZone);
                  return at === null ? null : (
                    <GlassChip
                      key={e.id}
                      label={e.title}
                      leading={e.emoji}
                      selected={reveal.title === e.title && reveal.at === at}
                      onPress={() => {
                        setReveal({ type: "event", title: e.title, at });
                      }}
                    />
                  );
                })}
              </View>
              <AppText variant="footnote" color="textSecondary">
                {revealWords(reveal, now.toString(), theirZone, now)} · {bothClocks(reveal.at)}
              </AppText>
            </View>
          ) : null}

          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={[styles.row, { gap: spacing.md }]}>
              <View style={[styles.flex, { gap: 2 }]}>
                <AppText variant="headline">Show a title before opening</AppText>
                <AppText variant="footnote" color="textSecondary">
                  {titled
                    ? "Only this title shows until it opens."
                    : `Off: ${partner} sees "${GENERIC_SURPRISE_TITLE}".`}
                </AppText>
              </View>
              <Toggle
                value={titled}
                onValueChange={setTitled}
                accessibilityLabel="Show a title before opening"
              />
            </View>
            {titled ? (
              <TextField
                label="Safe title"
                value={title}
                onChangeText={setTitle}
                maxLength={40}
                placeholder="For your birthday"
                helper="Nothing about what's inside."
              />
            ) : null}
          </Glass>

          <Button
            label="Next: preview"
            onPress={() => {
              setStep(3);
            }}
          />
        </View>
      ) : null}

      {/* SUR-04: exactly what the partner will see. */}
      {step === 3 ? (
        <View style={{ gap: spacing.lg }}>
          <AppText variant="largeTitle" serif>
            What {partner} will see
          </AppText>
          <AppText variant="footnote" weight="600" color="textSecondary">
            Before it opens
          </AppText>
          <Glass
            radius={radii.xl}
            tint="garnet"
            contentStyle={[styles.preview, { gap: spacing.sm }]}
          >
            <GiftCapsule state={reveal.type === "now" ? "ready" : "locked"} size="md" />
            <AppText variant="title" serif style={styles.center}>
              {shownTitle}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              From {me} · {revealWords(reveal, now.toString(), theirZone, now)}
            </AppText>
          </Glass>
          <NotificationMock frame="ios-lock" {...notifText} />
          <AppText variant="footnote" weight="600" color="textSecondary">
            Once opened
          </AppText>
          <SurpriseContentView
            content={content}
            authorName={me}
            recipientName={partner}
            at={now.toString()}
          />
          <View style={{ gap: spacing.sm }}>
            <Button label="Lock surprise" loading={create.isPending} onPress={lock} />
            <Button
              label="Back"
              variant="text"
              onPress={() => {
                setStep(2);
              }}
            />
          </View>
        </View>
      ) : null}

      {picker === "media" ? (
        <MediaPickerSheet
          visible
          onPick={(m: DemoMedia) => {
            setContent({ ...content, kind: m.type === "voice" ? "voice" : m.type, media: m });
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
            setContent({ ...content, kind: "voice", media: m });
            setPicker(null);
          }}
          onClose={() => {
            setPicker(null);
          }}
        />
      ) : null}
      <ActionSheet
        visible={discard}
        title="Discard this surprise?"
        body="What you made won't be kept."
        icon="trash"
        confirmLabel="Discard"
        destructive
        cancelLabel="Keep going"
        onConfirm={() => {
          setDiscard(false);
          goBack("/moments/surprises");
        }}
        onCancel={() => {
          setDiscard(false);
        }}
      />
    </GlassScreen>
  );
}

/** 09:00 in a zone on a plain date ("2026-11-02"). */
function morningAt(date: string, zone: string): string {
  return Temporal.PlainDate.from(date)
    .toZonedDateTime({ timeZone: zone, plainTime: { hour: 9, minute: 0 } })
    .toInstant()
    .toString();
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  third: { width: "31.5%" },
  kind: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 6,
    minHeight: 92,
    justifyContent: "center",
  },
  option: { flexDirection: "row", alignItems: "center", padding: 16 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  side: { width: 44, height: 44 },
  nextPill: { paddingHorizontal: 16, paddingVertical: 9 },
  preview: { alignItems: "center", padding: 24 },
  noGrow: { flexGrow: 0 },
});
