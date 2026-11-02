/**
 * US-01 · Us, redesigned in liquid glass (owner direction, P-60). A shared page (Garnet violet):
 * the two of you on a glass bridge with a bow of light between you; signals as a bento of glass
 * tiles, with the heavier ones gathered calmly in "When it's heavy"; your conversation; and a
 * quiet thread of what passed between you. Compose sheets open in the viewer's own colour.
 * Signals are communication, not measurement: no counts, streaks or "seen" (§5). The partner's
 * open support signal is pinned until answered or until they're okay (US-05, US-09). Offline
 * sending is open (U-30): a failed send says so.
 */
import type { SignalId } from "@garnet/domain";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { messagePreview } from "@/domain/chat";
import { SIGNAL_LOOK } from "@/domain/us";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useChatSummary } from "@/features/chat/useChat";
import { useCompanions } from "@/features/companions/useCompanions";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { BentoTile, OrbButton } from "./components/Bento";
import { SignalSheet } from "./components/SignalSheet";
import { SignalRow, SupportCard } from "./components/UsParts";
import { UsHero } from "./components/UsHero";
import { respondedLine } from "./signalText";
import { CountBadge } from "@/components/ui/CountBadge";
import { useAutoLocation } from "@/features/location/deviceLocation";
import { useRespond, useSendSignalWith, useUsOverview } from "./useUs";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER } from "@/theme/transitions";

/** The heavier signals, gathered calmly together (never alarm red). */
/** Height of the signal bento. */
const BENTO = 236;

const HEAVY: readonly { id: SignalId; word: string }[] = [
  { id: "need-you", word: "Need you" },
  { id: "need-to-talk", word: "Talk" },
  { id: "just-listen", word: "Listen" },
  { id: "check-on-me", word: "Check in" },
  { id: "cant-talk-yet", word: "Not yet" },
];

function UsContent() {
  // The distance on the hero uses this phone's location while Us is open (P-66).
  useAutoLocation();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const now = useNow();
  const overview = useUsOverview();
  const chat = useChatSummary();
  const looks = useCompanions();
  const send = useSendSignalWith();
  const respond = useRespond();
  const [compose, setCompose] = useState<SignalId | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState<{ key: number; emoji: string } | null>(null);
  const data = overview.data;
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };

  if (data === undefined)
    return (
      <GlassScreen tabBar>
        {overview.isError ? (
          <ErrorState
            onRetry={() => {
              void overview.refetch();
            }}
          />
        ) : (
          <Skeleton kind="detail" />
        )}
      </GlassScreen>
    );

  const { me, partner } = data;
  const lookOf = (side: typeof me.side) =>
    side === "sapphire" ? looks.sapphire : side === "ruby" ? looks.ruby : looks.garnet;
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  const last = chat.data?.lastMessage ?? null;
  const pick = (id: SignalId) => () => {
    setCompose(id);
  };

  return (
    <View style={styles.fill}>
      <GlassScreen tabBar>
        <Animated.View {...enter()} style={[styles.row, { gap: spacing.sm }]}>
          <AppText variant="largeTitle" style={styles.flex}>
            Us
          </AppText>
          <IconButton
            icon="clock"
            label="Signals between you"
            onPress={() => {
              router.push("/us/history");
            }}
          />
        </Animated.View>

        <Animated.View {...enter()}>
          <UsHero
            me={me}
            partner={partner}
            meLook={lookOf(me.side)}
            partnerLook={lookOf(partner.side)}
            now={now}
            sent={sent}
            distance={data.distance}
          />
        </Animated.View>

        {data.openSupport === null ? null : (
          <SupportCard
            item={data.openSupport}
            me={me}
            partner={partner}
            busy={respond.isPending}
            onRespond={(response) => {
              const item = data.openSupport;
              if (item === null) return;
              respond.mutate(
                { id: item.id, response },
                {
                  onSuccess: () => {
                    toast.show(respondedLine(response, partner.name), "success");
                  },
                  onError,
                },
              );
            }}
            onMessage={() => {
              router.push("/us/chat");
            }}
          />
        )}

        {/* The everyday signals as a bento of glass. */}
        <Animated.View {...enter()} style={[styles.row, styles.bento, { gap: spacing.md }]}>
          <BentoTile
            big
            height={BENTO}
            emoji={SIGNAL_LOOK["thought-of-you"].emoji}
            title={SIGNAL_LOOK["thought-of-you"].title}
            hint={`A little light for ${partner.name}`}
            glow={colors.garnet}
            onPress={pick("thought-of-you")}
            style={styles.big}
          />
          <View style={[styles.column, { gap: spacing.md }]}>
            <BentoTile
              emoji={SIGNAL_LOOK["missing-you"].emoji}
              title="Missing You"
              glow={palette.ruby400}
              onPress={pick("missing-you")}
              style={styles.small}
              height={(BENTO - spacing.md) / 2}
              delay={500}
            />
            <BentoTile
              emoji={SIGNAL_LOOK["okay-now"].emoji}
              title="I'm Okay"
              glow={palette.sapphire400}
              onPress={pick("okay-now")}
              style={styles.small}
              height={(BENTO - spacing.md) / 2}
              delay={900}
            />
          </View>
        </Animated.View>

        {/* The heavier ones, together and calm. */}
        <Animated.View {...enter()}>
          <Glass radius={radii.xl + 2} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <View style={[styles.row, { gap: spacing.sm }]}>
              <AppText variant="headline" style={styles.flex}>
                When it's heavy
              </AppText>
              <Icon name="heart" size={16} color={colors.accent} />
            </View>
            <View style={[styles.row, styles.spread]}>
              {HEAVY.map((h) => (
                <OrbButton
                  key={h.id}
                  emoji={SIGNAL_LOOK[h.id].emoji}
                  label={h.word}
                  title={SIGNAL_LOOK[h.id].title}
                  glow={colors.garnet}
                  onPress={pick(h.id)}
                />
              ))}
            </View>
          </Glass>
        </Animated.View>

        {/* Your conversation. */}
        <Animated.View {...enter()}>
          <Pressable
            onPress={() => {
              router.push("/us/chat");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Messages with ${partner.name}${(chat.data?.unreadCount ?? 0) > 0 ? `, ${String(chat.data?.unreadCount ?? 0)} unread` : ""}`}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Glass
              radius={radii.xl + 2}
              contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
            >
              <ProfileAvatar
                name={partner.name}
                avatar={partner.avatar ?? { kind: "initials", swatch: 1 }}
                side={partner.side}
                size={52}
              />
              <View style={[styles.flex, { gap: 2 }]}>
                <AppText variant="headline">Messages</AppText>
                <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                  {last === null ? "Say hello 💜" : messagePreview(last)}
                </AppText>
              </View>
              <CountBadge count={chat.data?.unreadCount ?? 0} />
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            </Glass>
          </Pressable>
        </Animated.View>

        {data.recent.length === 0 ? null : (
          <Animated.View {...enter()} style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <AppText variant="headline" style={styles.flex}>
                Between you
              </AppText>
              <Pressable
                onPress={() => {
                  router.push("/us/history");
                }}
                accessibilityRole="link"
                accessibilityLabel="All signals"
                hitSlop={10}
              >
                <AppText variant="callout" color="accent" weight="600">
                  All
                </AppText>
              </Pressable>
            </View>
            {data.recent.map((item) => (
              <SignalRow
                key={item.id}
                item={item}
                me={me}
                partner={partner}
                expanded={open === item.id}
                onToggle={() => {
                  setOpen(open === item.id ? null : item.id);
                }}
              />
            ))}
          </Animated.View>
        )}
      </GlassScreen>

      {compose === null ? null : (
        <SideScope side={me.side ?? "garnet"}>
          <SignalSheet
            signal={compose}
            partnerName={partner.name}
            partnerZone={partner.zone}
            sending={send.isPending}
            onClose={() => {
              setCompose(null);
            }}
            onSend={(payload) => {
              const signal = compose;
              send.mutate(
                { signal, payload },
                {
                  onSuccess: () => {
                    setCompose(null);
                    setSent((b) => ({ key: (b?.key ?? 0) + 1, emoji: SIGNAL_LOOK[signal].emoji }));
                  },
                  onError,
                },
              );
            }}
          />
        </SideScope>
      )}
    </View>
  );
}

export function UsScreen() {
  return (
    <SideScope side="garnet">
      <UsContent />
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
  spread: { justifyContent: "space-between" },
  bento: { alignItems: "flex-start" },
  big: { flex: 1.35 },
  column: { flex: 1 },
  small: {},
});
