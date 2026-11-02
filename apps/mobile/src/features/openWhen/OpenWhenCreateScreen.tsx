import { Haptics } from "@/components/ui/haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useOptionalToast } from "@/components/ui/Toast";
import type { LetterStyle, UnlockRule } from "@/domain/models";
import { DEFAULT_LETTER_STYLE, formatPromptTitle, SUGGESTED_PROMPTS } from "@/domain/openWhen";
import { useTheme } from "@/theme/ThemeProvider";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { noOutline, TextField } from "@/components/ui/TextField";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { VoicePlayer } from "@/features/days/components/VoicePlayer";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { useHomeToday } from "@/features/home/useHome";
import { GemCapsule } from "./components/GemCapsule";
import { LetterPaper } from "./components/LetterPaper";
import { useCreateDraft, useLetterSides, useSealLetter } from "./useOpenWhen";
import { goBack } from "@/navigation/goBack";

/** A small picture for each suggested moment (decorative; the words carry the meaning). */
const PROMPT_EMOJI: Readonly<Record<string, string>> = {
  "you miss me": "💌",
  "you have a terrible day": "🌧️",
  "you can't sleep": "🌙",
  "you're homesick": "🏡",
  "you're angry with me": "🕊️",
  "you need to laugh": "😄",
  "you need motivation": "✨",
  "on your first day at work": "💼",
  "you need to hear my voice": "🎧",
  "you want to remember us": "📸",
};

const UNLOCK_OPTIONS: readonly {
  id: "manual" | "date" | "event";
  emoji: string;
  title: string;
  detail: string;
}[] = [
  { id: "manual", emoji: "💜", title: "Anytime", detail: "" },
  {
    id: "date",
    emoji: "📅",
    title: "On a date and time",
    detail: "Opens on 5 January (06:00 London · 09:00 Addis Ababa)",
  },
  { id: "event", emoji: "🎉", title: "On an event", detail: 'When "First day at work" comes' },
];

/** A round glass button with a word under it, for tucking things into the letter. */
function AttachButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.attach, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <Glass radius={radii.lg} shadow={false} contentStyle={styles.attachInner}>
        <Icon name={icon} size={20} color={colors.accent} />
        <AppText variant="caption" weight="600" color="textSecondary">
          {label}
        </AppText>
      </Glass>
    </Pressable>
  );
}

export function OpenWhenCreateScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const toast = useOptionalToast();
  const sides = useLetterSides();

  const createDraft = useCreateDraft();
  const sealLetter = useSealLetter();

  // Wizard Step: 1 = Prompt, 2 = Body & Media, 3 = Unlock & Preview
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [selectedPrompt, setSelectedPrompt] = useState<string>("you miss me");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  const [bodyText, setBodyText] = useState("");
  // The paper and hand go with the letter, so it reads exactly as written (P-71).
  const [paper, setPaper] = useState<LetterStyle>(DEFAULT_LETTER_STYLE);
  const [media, setMedia] = useState<DemoMedia[]>([]);
  const [picker, setPicker] = useState<"media" | "voice" | null>(null);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"seal" | "discard" | null>(null);
  const people = useHomeToday().data;
  const partnerName = people?.partner.name ?? "your love";
  const myName = people?.me.name ?? "me";
  // Kept as refs the letter view understands: picture names, "voice-note", "song-…".
  const selectedPhotos = media.flatMap((m) => (m.type === "voice" ? [] : [m.art]));
  const hasVoice = media.some((m) => m.type === "voice");

  const [unlockType, setUnlockType] = useState<"manual" | "date" | "event">("manual");
  const [unlockDate] = useState("2027-01-05T06:00:00Z");
  const [unlockEvent] = useState("First day at work");

  const effectivePrompt = isCustom ? customPrompt : selectedPrompt;
  const fullPromptTitle = formatPromptTitle(effectivePrompt);

  const handleNextFromPrompt = () => {
    if (!effectivePrompt.trim()) {
      toast?.show("Please choose or write a prompt", "error");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleNextFromBody = () => {
    if (!bodyText.trim() && selectedPhotos.length === 0 && !hasVoice && !selectedSong) {
      toast?.show("Write a few words before continuing", "error");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
  };

  const handleSaveDraft = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createDraft.mutate(
      {
        safePrompt: fullPromptTitle,
        body: bodyText,
        paper,
        mediaRefs: [
          ...selectedPhotos,
          ...(hasVoice ? ["voice-note"] : []),
          ...(selectedSong ? [`song-${selectedSong}`] : []),
        ],
        unlock: buildUnlockRule(),
      },
      {
        onSuccess: () => {
          toast?.show("Draft saved on this device", "success");
          goBack("/moments/open-when");
        },
        onError: () => {
          toast?.show("Could not save draft", "error");
        },
      },
    );
  };

  const buildUnlockRule = (): UnlockRule => {
    if (unlockType === "date") {
      return { type: "date", at: unlockDate };
    }
    if (unlockType === "event") {
      return { type: "event", eventId: unlockEvent };
    }
    return { type: "manual" };
  };

  const handleSealConfirm = () => {
    setDialog("seal");
  };

  const seal = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createDraft.mutate(
      {
        safePrompt: fullPromptTitle,
        body: bodyText,
        paper,
        mediaRefs: [
          ...selectedPhotos,
          ...(hasVoice ? ["voice-note"] : []),
          ...(selectedSong ? [`song-${selectedSong}`] : []),
        ],
        unlock: buildUnlockRule(),
      },
      {
        onSuccess: (view) => {
          if (view.kind !== "unavailable") {
            sealLetter.mutate(
              { id: view.id, unlock: buildUnlockRule() },
              {
                onSuccess: () => {
                  setDialog(null);
                  toast?.show("Letter sealed with care 💜", "success");
                  router.replace("/moments/open-when");
                },
              },
            );
          }
        },
      },
    );
  };

  const handleClose = () => {
    if ((bodyText.trim() || media.length > 0) && step === 2) setDialog("discard");
    else goBack("/moments/open-when");
  };
  const back =
    step === 1
      ? handleClose
      : () => {
          setStep((s) => (s - 1) as 1 | 2 | 3);
        };
  const next = step === 1 ? handleNextFromPrompt : step === 2 ? handleNextFromBody : null;

  return (
    <GlassScreen
      wash="none"
      onBack={back}
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
          <View style={styles.navSide} />
        ) : (
          <Pressable
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? "Next to message" : "Next to seal condition"}
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
      {/* STEP 1: THE MOMENT (OPEN-02, glass redesign P-63) */}
      {step === 1 ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="largeTitle" serif>
              Open when…
            </AppText>
            <AppText variant="callout" color="textSecondary">
              Choose the moment {partnerName} should open this letter.
            </AppText>
          </View>

          {/* The envelope as it will look, updating as you choose. */}
          <Glass
            radius={radii.xl}
            tint={sides.mine}
            contentStyle={[styles.preview, { padding: spacing.xl, gap: spacing.md }]}
          >
            <GemCapsule side={sides.mine} state="sealed" size="sm" />
            <AppText variant="title" serif italic style={styles.center}>
              {fullPromptTitle}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              For {partnerName} · from {myName}
            </AppText>
          </Glass>

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Moments"
            style={[styles.chipsWrap, { gap: spacing.sm }]}
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
              <GlassChip
                key={prompt}
                label={prompt}
                leading={PROMPT_EMOJI[prompt] ?? "💌"}
                selected={!isCustom && selectedPrompt === prompt}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setIsCustom(false);
                  setSelectedPrompt(prompt);
                }}
              />
            ))}
            <GlassChip
              label="Write your own…"
              leading="✍️"
              selected={isCustom}
              onPress={() => {
                void Haptics.selectionAsync();
                setIsCustom(true);
              }}
            />
          </View>

          {isCustom ? (
            <TextField
              label="Open when…"
              icon="edit"
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="you see the snow in London"
              maxLength={80}
              autoFocus
            />
          ) : null}

          <Button label="Continue to writing" variant="primary" onPress={handleNextFromPrompt} />
        </View>
      ) : null}

      {/* STEP 2: THE LETTER (OPEN-03, redesign P-62) */}
      {step === 2 ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: 2 }}>
            <AppText variant="caption" weight="600" color="textTertiary">
              Open When letter
            </AppText>
            <AppText variant="title" serif italic numberOfLines={2}>
              {fullPromptTitle}
            </AppText>
          </View>

          <LetterPaper
            body={bodyText}
            onChange={setBodyText}
            paper={paper}
            onPaperChange={setPaper}
            to={partnerName}
            from={myName}
            placeholder={`Write from the heart. ${partnerName} will read this when the right time comes…`}
          />

          <View style={[styles.autosaveRow, { marginTop: -spacing.sm }]}>
            <Icon name="check" size={12} color={colors.textTertiary} />
            <AppText variant="caption" color="textTertiary">
              Draft saved on this device
            </AppText>
          </View>

          {/* Tucked in with the letter (simulated media). */}
          {media.length === 0 && selectedSong === null ? null : (
            <ScrollView
              horizontal
              style={styles.noGrow}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {media.map((m, i) => (
                <Glass
                  key={`${m.type}-${String(i)}`}
                  radius={radii.lg}
                  shadow={false}
                  contentStyle={{ padding: 4, width: m.type === "voice" ? 220 : 110 }}
                >
                  {m.type === "voice" ? (
                    <View style={{ padding: spacing.sm }}>
                      <VoicePlayer seconds={m.seconds} wave={m.wave} compact />
                    </View>
                  ) : (
                    <MediaArt
                      art={m.art}
                      {...(m.type === "video" ? { seconds: m.seconds } : {})}
                      height={110}
                      radius={radii.lg - 3}
                    />
                  )}
                  <Pressable
                    onPress={() => {
                      setMedia((x) => x.filter((_, j) => j !== i));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove attachment"
                    hitSlop={8}
                    style={styles.removeDot}
                  >
                    <Icon name="x" size={12} color="#FFFFFF" />
                  </Pressable>
                </Glass>
              ))}
              {selectedSong === null ? null : (
                <Glass
                  radius={radii.lg}
                  shadow={false}
                  contentStyle={[styles.songCard, { padding: spacing.md, gap: spacing.sm }]}
                >
                  <AppText variant="title" accessible={false}>
                    🎵
                  </AppText>
                  <TextInput
                    value={selectedSong}
                    onChangeText={setSelectedSong}
                    placeholder="Our song"
                    placeholderTextColor={colors.textTertiary}
                    accessibilityLabel="Song name"
                    maxLength={60}
                    style={[styles.songInput, noOutline, { color: colors.textPrimary }]}
                  />
                  <Pressable
                    onPress={() => {
                      setSelectedSong(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove song"
                    hitSlop={8}
                  >
                    <Icon name="x" size={14} color={colors.textTertiary} />
                  </Pressable>
                </Glass>
              )}
            </ScrollView>
          )}

          <View style={[styles.attachmentsRow, { gap: spacing.sm }]}>
            <AttachButton
              icon="image"
              label="Photo"
              onPress={() => {
                setPicker("media");
              }}
            />
            <AttachButton
              icon="mic"
              label="Voice"
              onPress={() => {
                setPicker("voice");
              }}
            />
            <AttachButton
              icon="sparkle"
              label="Song"
              onPress={() => {
                setSelectedSong((x) => x ?? "");
              }}
            />
          </View>

          <Button
            label="Next: Set unlock condition"
            variant="primary"
            onPress={handleNextFromBody}
          />
        </View>
      ) : null}

      {/* STEP 3: WHEN IT MAY OPEN, AND WHAT THEY'LL SEE (OPEN-04, glass redesign P-63) */}
      {step === 3 ? (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="largeTitle" serif>
              When can {partnerName} open it?
            </AppText>
            <AppText variant="callout" color="textSecondary">
              The letter stays sealed until then.
            </AppText>
          </View>

          <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
            {UNLOCK_OPTIONS.map((o) => {
              const on = unlockType === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setUnlockType(o.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={o.title}
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
                >
                  <Glass
                    radius={radii.lg}
                    shadow={on}
                    tint={on ? sides.mine : "none"}
                    contentStyle={[styles.option, { padding: spacing.lg, gap: spacing.md }]}
                  >
                    <AppText variant="title" accessible={false}>
                      {o.emoji}
                    </AppText>
                    <View style={[styles.flexOne, { gap: 2 }]}>
                      <AppText variant="headline">{o.title}</AppText>
                      <AppText variant="footnote" color="textSecondary">
                        {o.id === "manual" ? `${partnerName} decides when they need it` : o.detail}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: on ? colors.accent : colors.glassRimEnd,
                          backgroundColor: on ? colors.accent : "transparent",
                        },
                      ]}
                    >
                      {on ? <Icon name="check" size={13} color={colors.onAccent} /> : null}
                    </View>
                  </Glass>
                </Pressable>
              );
            })}
          </View>

          {/* What the partner sees before opening: the sealed envelope only (OPEN-04, A9). */}
          <View style={{ gap: spacing.sm }}>
            <AppText variant="footnote" weight="600" color="textSecondary">
              What {partnerName} will see before opening
            </AppText>
            <Glass
              radius={radii.xl}
              tint={sides.theirs}
              contentStyle={[styles.preview, { padding: spacing.xl, gap: spacing.sm }]}
            >
              <GemCapsule side={sides.mine} state="sealed" size="md" />
              <AppText variant="title" serif italic style={styles.center}>
                {fullPromptTitle}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                From {myName} · sealed
              </AppText>
            </Glass>
          </View>

          <Notice
            tone="info"
            icon="sparkle"
            text={`Once sealed, you can't edit it. ${partnerName} sees only the envelope until it may open.`}
          />

          <View style={{ gap: spacing.sm }}>
            <Button label="Seal letter" variant="primary" onPress={handleSealConfirm} />
            <Button label="Save as draft" variant="subtle" onPress={handleSaveDraft} />
          </View>
        </View>
      ) : null}

      {picker === "media" ? (
        <MediaPickerSheet
          visible
          onPick={(m) => {
            setMedia((x) => [...x, m]);
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
            setMedia((x) => [...x.filter((y) => y.type !== "voice"), m]);
            setPicker(null);
          }}
          onClose={() => {
            setPicker(null);
          }}
        />
      ) : null}
      <ActionSheet
        visible={dialog === "seal"}
        title="Seal this letter?"
        body={`Once sealed, you can't edit it. ${partnerName} can open it when the time comes.`}
        art={<GemCapsule side={sides.mine} state="sealed" size="sm" />}
        confirmLabel="Seal letter"
        confirming={createDraft.isPending || sealLetter.isPending}
        onConfirm={seal}
        onCancel={() => {
          setDialog(null);
        }}
      />
      <ActionSheet
        visible={dialog === "discard"}
        title="Discard this letter?"
        body="What you wrote won't be kept. Save a draft to finish it later."
        icon="trash"
        confirmLabel="Discard"
        destructive
        cancelLabel="Keep writing"
        onConfirm={() => {
          setDialog(null);
          goBack("/moments/open-when");
        }}
        onCancel={() => {
          setDialog(null);
        }}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  // A sideways row must not stretch to fill the column (react-native-web).
  noGrow: { flexGrow: 0 },
  flexOne: { flex: 1 },
  center: { textAlign: "center" },
  navSide: { width: 44, height: 44 },
  nextPill: { paddingHorizontal: 16, paddingVertical: 9 },
  preview: { alignItems: "center", minHeight: 150, justifyContent: "center" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap" },
  autosaveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  attachmentsRow: { flexDirection: "row", flexWrap: "wrap" },
  songCard: { flexDirection: "row", alignItems: "center" },
  songInput: { minWidth: 140, fontSize: 16, paddingVertical: 4 },
  option: { flexDirection: "row", alignItems: "center" },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  attach: { flex: 1 },
  attachInner: { alignItems: "center", gap: 4, paddingVertical: 12 },
  removeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(10,8,20,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
