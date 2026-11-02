import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import type { HomePerson, SignalItem } from "@/data/repositories/types";
import { localTimeLabel } from "@/domain/identity";
import {
  RESPONSE_LABEL,
  receivedLine,
  responsesFor,
  sentLine,
  SIGNAL_LOOK,
  type SignalResponse,
} from "@/domain/us";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { payloadLines, replyLine } from "../signalText";
import { ENTER, EXIT, LAYOUT } from "@/theme/transitions";

/** "18:42 · 20:42 for you": the sender's time, then the viewer's when the zones differ. */
export function bothTimes(at: string, from: HomePerson, viewer: HomePerson): string {
  const i = Temporal.Instant.from(at);
  const theirs = localTimeLabel(i, from.zone);
  const mine = localTimeLabel(i, viewer.zone);
  return theirs === mine ? theirs : `${theirs} · ${mine} for you`;
}

/**
 * US-05 · The partner's open support signal, pinned gently at the top of Us: what they need,
 * their words, both times, and replies. Calm, not alarming; no call buttons (A13).
 */
export function SupportCard({
  item,
  me,
  partner,
  busy,
  onRespond,
  onMessage,
}: {
  item: SignalItem;
  me: HomePerson;
  partner: HomePerson;
  busy: boolean;
  onRespond: (r: SignalResponse) => void;
  onMessage: () => void;
}) {
  const { radii, spacing } = useTheme();
  const replies = responsesFor(item.signal);
  const title = receivedLine(item.signal, partner.name, item.payload);
  const details = payloadLines(item.payload, title);
  return (
    <Animated.View entering={ENTER} exiting={EXIT} layout={LAYOUT}>
      <Glass
        radius={radii.xl}
        tint={partner.side ?? "garnet"}
        contentStyle={{ padding: spacing.xl, gap: spacing.md }}
      >
        <View accessibilityLiveRegion="polite" style={[styles.row, { gap: spacing.md }]}>
          <AppText variant="title" accessible={false}>
            {SIGNAL_LOOK[item.signal].emoji}
          </AppText>
          <View style={styles.flex}>
            <AppText variant="headline">
              {receivedLine(item.signal, partner.name, item.payload)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {bothTimes(item.at, partner, me)}
            </AppText>
          </View>
        </View>
        {details.length === 0 ? null : (
          <AppText variant="callout" color="textSecondary">
            {details.join(" · ")}
          </AppText>
        )}
        {item.payload.note === undefined ? null : (
          <AppText variant="callout" serif italic>
            “{item.payload.note}”
          </AppText>
        )}
        <View style={{ gap: spacing.sm }}>
          {replies.map((r, i) => (
            <Button
              key={r}
              label={RESPONSE_LABEL[r]}
              variant={i === 0 ? "primary" : "secondary"}
              disabled={busy}
              onPress={() => {
                onRespond(r);
              }}
            />
          ))}
          <Button label="Message" variant="text" onPress={onMessage} />
        </View>
      </Glass>
    </Animated.View>
  );
}

/** One history line (US-01 recent, US-10). Tap to see the words and replies. */
export function SignalRow({
  item,
  me,
  partner,
  expanded,
  onToggle,
}: {
  item: SignalItem;
  me: HomePerson;
  partner: HomePerson;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { radii, spacing } = useTheme();
  // The ring is the sender's colour; the line itself names who sent it (never colour alone).
  const from = item.mine ? me : partner;
  const line = item.mine
    ? sentLine(item.signal)
    : receivedLine(item.signal, partner.name, item.payload);
  const details = payloadLines(item.payload, line);
  const replier = item.mine ? partner.name : "You";
  return (
    <Animated.View layout={LAYOUT}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={line}
        accessibilityState={{ expanded }}
      >
        <Glass
          radius={radii.lg}
          shadow={false}
          contentStyle={{ padding: spacing.md, gap: spacing.sm }}
        >
          <View style={[styles.row, { gap: spacing.md }]}>
            <View style={[styles.disc, { borderColor: sideColor(from.side) }]}>
              <AppText variant="body" accessible={false}>
                {SIGNAL_LOOK[item.signal].emoji}
              </AppText>
            </View>
            <AppText variant="callout" style={styles.flex} numberOfLines={expanded ? 4 : 1}>
              {line}
            </AppText>
            <AppText variant="caption" color="textTertiary">
              {localTimeLabel(Temporal.Instant.from(item.at), me.zone)}
            </AppText>
          </View>
          {expanded ? (
            <Animated.View entering={ENTER} style={[styles.detail, { gap: spacing.xs }]}>
              {details.map((d) => (
                <AppText key={d} variant="footnote" color="textSecondary">
                  {d}
                </AppText>
              ))}
              {item.payload.note === undefined ? null : (
                <AppText variant="callout" serif italic>
                  “{item.payload.note}”
                </AppText>
              )}
              {item.responses.map((r, i) => (
                <AppText key={`${r}-${i}`} variant="footnote" color="accent" weight="600">
                  {replyLine(r, replier)}
                </AppText>
              ))}
              <AppText variant="caption" color="textTertiary">
                {bothTimes(item.at, from, me)}
              </AppText>
              {details.length === 0 &&
              item.payload.note === undefined &&
              item.responses.length === 0 ? (
                <AppText variant="footnote" color="textTertiary">
                  Just the signal.
                </AppText>
              ) : null}
            </Animated.View>
          ) : null}
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  person: { alignItems: "center", width: 96 },
  link: { flex: 1, height: 3, borderRadius: 2, marginBottom: 40, justifyContent: "center" },
  light: { width: 10, height: 10, borderRadius: 5 },
  tile: { width: "48%" },
  tileInner: { minHeight: 112, justifyContent: "space-between" },
  wide: { width: "100%" },
  wideInner: { flexDirection: "row", alignItems: "center" },
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  detail: { paddingLeft: 52 },
  burst: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  sent: { paddingHorizontal: 22, paddingVertical: 12 },
});
