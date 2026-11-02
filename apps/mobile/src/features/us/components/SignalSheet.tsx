import type { SignalId } from "@garnet/domain";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SideCharacter } from "@/components/character/SideCharacter";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { localTimeLabel } from "@/domain/identity";
import {
  CANT_TALK_OPTIONS,
  CHECK_WHEN,
  checkInAt,
  MISSING_LEVELS,
  NEEDS,
  SIGNAL_LOOK,
  TALK_TOPICS,
  type CheckWhen,
  type MissingLevel,
  type NeedId,
  type SignalPayload,
  type TalkTopic,
} from "@/domain/us";
import { useNow } from "@/features/setup/useNow";
import { useTheme } from "@/theme/ThemeProvider";
import { sendLabel } from "../signalText";
import { ENTER } from "@/theme/transitions";

type Attachment = "photo" | "voice" | "video";
const ATTACH: readonly { id: Attachment; label: string; emoji: string }[] = [
  { id: "photo", label: "Photo", emoji: "📸" },
  { id: "voice", label: "Voice", emoji: "🎙️" },
  { id: "video", label: "Video", emoji: "🎬" },
];

const POSE: Record<SignalId, "happy" | "hug" | "listening" | "thinking" | "idle"> = {
  "thought-of-you": "happy",
  "missing-you": "hug",
  "need-you": "hug",
  "need-to-talk": "listening",
  "just-listen": "listening",
  "check-on-me": "thinking",
  "cant-talk-yet": "idle",
  "okay-now": "happy",
};

/** A calm highlighted line (Just listen, I can't talk yet). */
function Callout({ text }: { text: string }) {
  const { radii, spacing } = useTheme();
  return (
    <Animated.View entering={ENTER}>
      <Glass radius={radii.lg} tint="garnet" shadow={false} contentStyle={{ padding: spacing.lg }}>
        <AppText variant="callout" serif italic>
          {text}
        </AppText>
      </Glass>
    </Animated.View>
  );
}

/**
 * US-02 to US-09 · Compose one signal, in the viewer's own colour. Everything is optional: a
 * signal can go with one tap. Calm for support signals (no alarm red). Attachments are
 * simulated (only their kind is recorded). Check-in times show in the partner's zone (P-56,
 * proposed); quiet hours still apply (window U-21 open). Nothing here says "seen" (§5).
 */
export function SignalSheet({
  signal,
  partnerName,
  partnerZone,
  sending,
  onSend,
  onClose,
}: {
  signal: SignalId;
  partnerName: string;
  partnerZone: string;
  sending: boolean;
  onSend: (payload: SignalPayload) => void;
  onClose: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  const look = SIGNAL_LOOK[signal];
  const [note, setNote] = useState("");
  const [level, setLevel] = useState<MissingLevel | null>(null);
  const [need, setNeed] = useState<NeedId | null>(null);
  const [topic, setTopic] = useState<TalkTopic | null>(
    signal === "just-listen" ? "Just listen" : null,
  );
  const [when, setWhen] = useState<CheckWhen>("tonight");
  const [options, setOptions] = useState<readonly string[]>([]);
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const now = useNow();

  const payload = (): SignalPayload => ({
    ...(note.trim().length === 0 ? {} : { note: note.trim() }),
    ...(signal === "missing-you" && level !== null ? { level } : {}),
    ...(signal === "need-you" && need !== null ? { need } : {}),
    ...((signal === "need-to-talk" || signal === "just-listen") && topic !== null ? { topic } : {}),
    ...(signal === "check-on-me" ? { when } : {}),
    ...(signal === "cant-talk-yet" && options.length > 0 ? { options } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  });
  const toggle = <T,>(list: readonly T[], x: T) =>
    list.includes(x) ? list.filter((y) => y !== x) : [...list, x];

  return (
    <Sheet
      visible
      onClose={onClose}
      peek={<SideCharacter pose={POSE[signal]} size={104} />}
      footer={
        <Button
          label={sendLabel(signal, partnerName)}
          loading={sending}
          onPress={() => {
            onSend(payload());
          }}
        />
      }
    >
      <View style={[styles.center, { gap: spacing.xs }]}>
        <AppText variant="hero" accessible={false}>
          {look.emoji}
        </AppText>
        <AppText variant="title" serif style={styles.textCenter}>
          {signal === "need-you"
            ? "What do you need right now?"
            : signal === "okay-now"
              ? `Let ${partnerName} know you're okay now`
              : look.title}
        </AppText>
      </View>

      {signal === "missing-you" ? (
        <View accessibilityRole="radiogroup" style={[styles.wrapCenter, { gap: spacing.sm }]}>
          {MISSING_LEVELS.map((l) => (
            <GlassChip
              key={l}
              label={l}
              selected={level === l}
              onPress={() => {
                setLevel(level === l ? null : l);
              }}
            />
          ))}
        </View>
      ) : null}

      {signal === "need-you" ? (
        <View accessibilityRole="radiogroup" style={{ gap: spacing.xs }}>
          {NEEDS.map((n) => {
            const on = need === n.id;
            return (
              <Animated.View key={n.id} entering={ENTER}>
                <Pressable
                  onPress={() => {
                    setNeed(on ? null : n.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={n.label}
                  accessibilityState={{ checked: on }}
                  style={[
                    styles.needRow,
                    {
                      gap: spacing.md,
                      borderRadius: radii.lg,
                      backgroundColor: on ? colors.accentSoft : colors.glassVeilSoft,
                      borderColor: on ? colors.accent : colors.glassRimEnd,
                      borderWidth: on ? 1.5 : 1,
                    },
                  ]}
                >
                  <AppText variant="headline" accessible={false}>
                    {n.emoji}
                  </AppText>
                  <AppText variant="callout" weight={on ? "600" : "500"} style={styles.flex}>
                    {n.label}
                  </AppText>
                  {on ? <Icon name="check" size={18} color={colors.accent} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      {signal === "need-to-talk" || signal === "just-listen" ? (
        <View style={{ gap: spacing.md }}>
          <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: spacing.sm }]}>
            {TALK_TOPICS.map((t) => (
              <GlassChip
                key={t}
                label={t}
                selected={topic === t}
                onPress={() => {
                  setTopic(topic === t ? null : t);
                }}
              />
            ))}
          </View>
          {topic === "Just listen" ? (
            <Callout text="I don't need advice right now. I need you to listen." />
          ) : null}
        </View>
      ) : null}

      {signal === "check-on-me" ? (
        <View style={{ gap: spacing.sm }}>
          <Glass radius={radii.lg} shadow={false} contentStyle={{ padding: spacing.xs }}>
            <View accessibilityRole="radiogroup">
              {CHECK_WHEN.map((w) => {
                const on = when === w.id;
                const at = checkInAt(w.id, now, partnerZone);
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setWhen(w.id);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${w.label}, around ${localTimeLabel(at.toInstant(), partnerZone)} for ${partnerName}`}
                    accessibilityState={{ checked: on }}
                    style={[
                      styles.whenRow,
                      {
                        gap: spacing.md,
                        borderRadius: radii.md,
                        backgroundColor: on ? colors.accentSoft : "transparent",
                      },
                    ]}
                  >
                    <AppText variant="callout" weight={on ? "600" : "500"} style={styles.flex}>
                      {w.label}
                    </AppText>
                    <AppText variant="footnote" color="textSecondary">
                      {w.id === "now"
                        ? "now"
                        : `around ${localTimeLabel(at.toInstant(), partnerZone)}`}{" "}
                      for {partnerName}
                    </AppText>
                    {on ? <Icon name="check" size={18} color={colors.accent} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Glass>
          <AppText variant="footnote" color="textTertiary" style={styles.textCenter}>
            {`Garnet will remind ${partnerName} gently, respecting quiet hours.`}
          </AppText>
        </View>
      ) : null}

      {signal === "cant-talk-yet" ? (
        <View style={{ gap: spacing.md }}>
          <Callout text="I'm not okay, but I'm not ready to talk yet." />
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {CANT_TALK_OPTIONS.map((o) => (
              <GlassChip
                key={o}
                role="checkbox"
                label={o}
                selected={options.includes(o)}
                onPress={() => {
                  setOptions((x) => toggle(x, o));
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label="A few words"
        placeholder="Add a few words (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={200}
      />

      {signal === "thought-of-you" || signal === "need-you" ? (
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {ATTACH.map((a) => (
            <GlassChip
              key={a.id}
              role="checkbox"
              leading={a.emoji}
              label={a.label}
              selected={attachments.includes(a.id)}
              onPress={() => {
                setAttachments((x) => toggle(x, a.id));
              }}
            />
          ))}
        </View>
      ) : null}

      {signal === "need-you" ? (
        <View style={[styles.row, styles.centerRow, { gap: spacing.xs }]}>
          <Icon name="info" size={14} color={colors.textTertiary} />
          <AppText variant="footnote" color="textTertiary">
            Garnet isn't an emergency service.
          </AppText>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  centerRow: { justifyContent: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  wrapCenter: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  needRow: { flexDirection: "row", alignItems: "center", minHeight: 54, paddingHorizontal: 14 },
  whenRow: { flexDirection: "row", alignItems: "center", minHeight: 52, paddingHorizontal: 12 },
});
