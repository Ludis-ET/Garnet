/**
 * HOME-01 to HOME-05 · Home (Daylight Glass liquid, minimal; P-53). A shared page, so it renders
 * in Garnet violet with Ruby and Sapphire as the two lights. Only the viewer's own day shows
 * (the partner's waits for the reveal, U-02/U-06); private drafts are marked "Only you"; the
 * waiting item carries no content (A9); senders see "Sent" only (§5); no streaks or scores
 * (U-03/U-04/U-24 open).
 */
import type { SignalId } from "@garnet/domain";
import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { greeting } from "@/domain/home";
import { localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { SignOutDialog } from "@/features/auth/SignOutDialog";
import { ProfileAvatar, sideColor } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { useSetupState } from "@/features/setup/useSetup";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { router } from "expo-router";
import { SIGNAL_LOOK } from "@/domain/us";
import { useCompanions } from "@/features/companions/useCompanions";
import { HeroOrb, type HeroPulse, type HeroShortcut } from "./components/HeroOrb";
import { LogSheet } from "./components/LogSheet";
import { MoreSheet } from "./components/MoreSheet";
import { ProfileMenu } from "./components/ProfileMenu";
import { SignalButton } from "./components/SignalButton";
import { incomingLine, QUICK_SIGNALS, signalLabel } from "./signals";
import { useSaveEntry } from "@/features/days/useDays";
import { useDismissIncoming, useHomeToday, useSendSignal } from "./useHome";
import { useHasUnread, useUnreadCount } from "@/features/notifications/useInbox";
import { CountBadge } from "@/components/ui/CountBadge";
import { useAutoLocation } from "@/features/location/deviceLocation";
import { useChatSummary } from "@/features/chat/useChat";
import { useSettings } from "@/features/settings/useSettings";
import { useUsOverview } from "@/features/us/useUs";
import {
  LettersTile,
  MemoryTile,
  MessagesTile,
  RightNowCard,
  TodayCard,
  UpcomingTile,
} from "./components/HomeCards";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER, EXIT } from "@/theme/transitions";

/** A small, stable number for a string id (spark keys). */
function keyOf(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) + 1;
}

function HomeContent() {
  // The distance on Home and Us uses this phone's location while the app is open (P-66).
  useAutoLocation();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const unread = useUnreadCount();
  const anyNew = useHasUnread();
  const chat = useChatSummary();
  const unreadMessages = chat.data?.unreadCount ?? 0;
  const distance = useUsOverview().data?.distance ?? null;
  const prefs = useSettings().data?.settings.home;
  const cards = prefs?.cards ?? {
    now: true,
    messages: true,
    upcoming: true,
    letters: true,
    memory: true,
    today: true,
  };
  const { width } = useWindowDimensions();
  const now = useNow();
  const today = useHomeToday();
  const setup = useSetupState();
  const log = useSaveEntry();
  const send = useSendSignal();
  const dismiss = useDismissIncoming();
  const [sheet, setSheet] = useState<"log" | "more" | "menu" | "signout" | null>(null);
  const [myPulse, setMyPulse] = useState<HeroPulse | null>(null);
  const looks = useCompanions();

  const data = today.data;
  // In-app pop-ups follow the person's own alert choices from setup (SETUP-07, P-57): thoughts
  // and support signals only float over Home when that category is on.
  const alerts = setup.data?.profile.notifications;
  const rawIncoming = data?.incoming ?? null;
  const incoming =
    rawIncoming === null ||
    (SIGNAL_LOOK[rawIncoming.signal].support ? alerts?.support : alerts?.thoughts) === false
      ? null
      : rawIncoming;
  const incomingId = incoming?.id ?? null;
  const dismissLater = useEffectEvent((id: string) => {
    dismiss.mutate(id);
  });
  // The partner's signal shows for a moment above the orb, then is dismissed on this phone only.
  useEffect(() => {
    if (incomingId === null) return;
    const timer = setTimeout(() => {
      dismissLater(incomingId);
    }, 3200);
    return () => {
      clearTimeout(timer);
    };
  }, [incomingId]);

  if (data === undefined) {
    return (
      <GlassScreen tabBar>
        {today.isError ? (
          <ErrorState
            onRetry={() => {
              void today.refetch();
            }}
          />
        ) : (
          <Skeleton kind="detail" />
        )}
      </GlassScreen>
    );
  }

  const { me, partner } = data;
  const mine = sideColor(me.side);
  const theirs = sideColor(partner.side);
  const pulse: HeroPulse | null =
    incoming === null ? myPulse : { key: keyOf(incoming.id), from: "partner", color: theirs };
  const heroWidth = Math.min(width - spacing.gutter * 2, 440);
  const orb = Math.round(Math.min(heroWidth - 56, 280));
  const shortcuts: HeroShortcut[] = [
    {
      id: "log",
      emoji: "✍️",
      label: "Log",
      onPress: () => {
        setSheet("log");
      },
    },
    {
      id: "days",
      emoji: "📅",
      label: "Days",
      onPress: () => {
        router.push("/days");
      },
    },
    {
      id: "chat",
      emoji: "💬",
      label: "Chat",
      badge: unreadMessages,
      onPress: () => {
        router.push("/us/chat");
      },
    },
    {
      id: "letters",
      emoji: "💌",
      label: "Open When",
      badge: data.waitingCount,
      onPress: () => {
        router.push("/moments/open-when");
      },
    },
    {
      id: "memories",
      emoji: "📸",
      label: "Memories",
      onPress: () => {
        router.push("/our-world");
      },
    },
    {
      id: "events",
      emoji: "🎂",
      label: "Events",
      onPress: () => {
        router.push("/moments");
      },
    },
    {
      id: "chapters",
      emoji: "📖",
      label: "Chapters",
      onPress: () => {
        router.push("/our-world/chapters");
      },
    },
    {
      id: "signals",
      emoji: "🫂",
      label: "Signals",
      onPress: () => {
        router.push("/us");
      },
    },
  ];
  const enter = () =>
    reduceMotion
      ? {}
      : {
          entering: ENTER,
        };
  const sparkle = () => {
    setMyPulse((p) => ({ key: (p?.key ?? 0) + 1, from: "me", color: mine }));
  };
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const sendSignal = (id: SignalId) => {
    send.mutate(id, { onSuccess: sparkle, onError });
  };
  const avatar = setup.data?.profile.avatar ?? { kind: "initials" as const, swatch: 0 };

  return (
    <GlassScreen tabBar>
      {/* Greeting, the two clocks and your picture. */}
      <Animated.View {...enter()} style={[styles.row, { gap: spacing.md }]}>
        <View style={[styles.flex, { gap: spacing.sm }]}>
          <AppText variant="question" numberOfLines={1}>
            {greeting(now, me.zone, me.name)}
          </AppText>
          <Glass
            radius={radii.pill}
            shadow={false}
            style={styles.self}
            contentStyle={[styles.row, styles.clocks, { gap: spacing.sm }]}
          >
            <View style={[styles.dot, { backgroundColor: mine }]} />
            <AppText variant="caption" weight="600">
              {localTimeLabel(now, me.zone)}
            </AppText>
            <View style={[styles.dot, { backgroundColor: theirs }]} />
            <AppText variant="caption" weight="600">
              {localTimeLabel(now, partner.zone)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {partner.name}
            </AppText>
          </Glass>
        </View>
        {/* Search and notifications (P-63): small glass buttons beside your picture. */}
        <View style={[styles.row, { gap: spacing.xs }]}>
          <Pressable
            onPress={() => {
              router.push("/search");
            }}
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={4}
          >
            <Glass radius={20} shadow={false} contentStyle={styles.round}>
              <Icon name="search" size={19} color={colors.textPrimary} />
            </Glass>
          </Pressable>
          <Pressable
            onPress={() => {
              router.push("/notifications");
            }}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? `Notifications, ${String(unread)} new`
                : anyNew
                  ? "Notifications, something new"
                  : "Notifications"
            }
            hitSlop={4}
          >
            <Glass radius={20} shadow={false} contentStyle={styles.round}>
              <Icon name="bell" size={19} color={colors.textPrimary} />
            </Glass>
            <CountBadge count={unread} dot={anyNew} style={styles.bellBadge} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setSheet("menu");
          }}
          accessibilityRole="button"
          accessibilityLabel="Profile menu"
          hitSlop={6}
        >
          <ProfileAvatar name={me.name} avatar={avatar} side={me.side} size={48} />
        </Pressable>
      </Animated.View>

      {/* EVT-09: today's birthday or anniversary, once, with a sparkle. */}
      {data.event?.daysAway === 0 &&
      (data.event.kind === "birthday" || data.event.kind === "anniversary") ? (
        <Animated.View {...enter()}>
          <Pressable
            onPress={() => {
              const id = data.event?.id;
              if (id !== undefined)
                router.push({ pathname: "/moments/event/[id]", params: { id } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${data.event.title} is today. Open`}
          >
            <Glass
              radius={radii.pill}
              tint="garnet"
              contentStyle={[styles.row, styles.capsule, { gap: spacing.sm }]}
            >
              <AppText variant="headline">{data.event.emoji}</AppText>
              <AppText variant="callout" weight="600" style={styles.flex}>
                {data.event.title} is today
              </AppText>
              <Icon name="chevron-right" size={16} color={colors.accent} />
            </Glass>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* The hero, and Noah's signal floating above it. */}
      <Animated.View {...enter()} style={styles.center}>
        <HeroOrb
          size={orb}
          width={heroWidth}
          pulse={pulse}
          look={looks.garnet}
          shortcuts={prefs?.ring === false ? [] : shortcuts}
        />
        {incoming === null ? null : (
          <Animated.View
            key={incoming.id}
            {...(reduceMotion ? {} : { entering: ENTER, exiting: EXIT })}
            accessibilityLiveRegion="polite"
            style={styles.incoming}
          >
            <Glass
              radius={radii.pill}
              contentStyle={[styles.row, styles.capsule, { gap: spacing.xs }]}
            >
              <View style={[styles.dot, { backgroundColor: theirs }]} />
              <AppText variant="callout" weight="600">
                {incomingLine(incoming.signal, partner.name)}
              </AppText>
            </Glass>
          </Animated.View>
        )}
      </Animated.View>

      {/* Hold-to-send signals, in one glass dock (P-66). */}
      <Animated.View {...enter()}>
        <Glass radius={radii.xl + 6} contentStyle={[styles.dock, { gap: spacing.sm }]}>
          <AppText variant="caption" weight="600" color="textSecondary" style={styles.dockHint}>
            Hold to send to {partner.name}
          </AppText>
          <View style={styles.signals}>
            {QUICK_SIGNALS.map((s) => (
              <SignalButton
                key={s.id}
                emoji={s.emoji}
                word={s.word}
                label={signalLabel(s.id)}
                partnerName={partner.name}
                onSend={() => {
                  sendSignal(s.id);
                }}
              />
            ))}
            <Pressable
              onPress={() => {
                setSheet("more");
              }}
              accessibilityRole="button"
              accessibilityLabel="More signals"
              style={styles.moreCol}
            >
              <Glass radius={32} contentStyle={styles.more}>
                <Icon name="plus" size={22} color={colors.textSecondary} />
              </Glass>
              <AppText variant="caption" color="textSecondary">
                More
              </AppText>
            </Pressable>
          </View>
        </Glass>
      </Animated.View>
      <Animated.View {...enter()}>
        <Button
          label="Log a moment"
          onPress={() => {
            setSheet("log");
          }}
        />
      </Animated.View>

      {/* Below Garnet (P-66): glass cards that are actually useful, each one the person can hide. */}
      {cards.now ? (
        <RightNowCard
          index={4}
          me={me}
          partner={partner}
          now={now}
          km={distance}
          onPress={() => {
            router.push("/us");
          }}
        />
      ) : null}
      {cards.messages || (cards.upcoming && data.event !== null) ? (
        <View style={[styles.row, styles.pair, { gap: spacing.md }]}>
          {cards.messages ? (
            <MessagesTile
              index={5}
              partner={partner}
              unread={unreadMessages}
              last={chat.data?.lastMessage ?? null}
              onPress={() => {
                router.push("/us/chat");
              }}
            />
          ) : null}
          {cards.upcoming && data.event !== null ? (
            <UpcomingTile
              index={6}
              event={data.event}
              onPress={() => {
                const id = data.event?.id;
                if (id !== undefined)
                  router.push({ pathname: "/moments/event/[id]", params: { id } });
              }}
            />
          ) : null}
        </View>
      ) : null}
      {cards.letters || (cards.memory && data.memory !== null) ? (
        <View style={[styles.row, styles.pair, { gap: spacing.md }]}>
          {cards.letters ? (
            <LettersTile
              index={7}
              count={data.waitingCount}
              onOpen={() => {
                router.push("/moments/open-when");
              }}
              onWrite={() => {
                router.push("/moments/open-when/new");
              }}
            />
          ) : null}
          {cards.memory && data.memory !== null ? (
            <MemoryTile
              index={8}
              memory={data.memory}
              zone={me.zone}
              onPress={() => {
                const id = data.memory?.id;
                if (id !== undefined)
                  router.push({ pathname: "/our-world/memory/[id]", params: { id } });
              }}
            />
          ) : null}
        </View>
      ) : null}
      {cards.today ? (
        <TodayCard
          index={9}
          zone={me.zone}
          moments={data.moments}
          onPress={() => {
            router.push("/days");
          }}
        />
      ) : null}

      <LogSheet
        visible={sheet === "log"}
        partnerName={partner.name}
        saving={log.isPending}
        onSave={({ input, draft }) => {
          // Saved through Days, so the kind, picture, feeling, activity and place are all kept.
          log.mutate(input, {
            onSuccess: () => {
              setSheet(null);
              if (draft) {
                toast.show("Kept as a draft.");
                return;
              }
              sparkle();
              toast.show(
                input.visibility === "shared"
                  ? `Shared with ${partner.name}.`
                  : input.visibility === "afterReveal"
                    ? "Saved for when your days meet."
                    : "Kept private.",
                "success",
              );
            },
            onError,
          });
        }}
        onClose={() => {
          setSheet(null);
        }}
      />
      <MoreSheet
        visible={sheet === "more"}
        partnerName={partner.name}
        onSend={sendSignal}
        onClose={() => {
          setSheet(null);
        }}
      />
      <ProfileMenu
        visible={sheet === "menu"}
        name={me.name}
        side={me.side}
        avatar={avatar}
        onClose={() => {
          setSheet(null);
        }}
        onSettings={() => {
          setSheet(null);
          router.push("/settings");
        }}
        onSignOut={() => {
          setSheet("signout");
        }}
      />
      <SignOutDialog
        visible={sheet === "signout"}
        onClose={() => {
          setSheet(null);
        }}
      />
    </GlassScreen>
  );
}

/** Home is a shared page: Garnet violet throughout, Ruby and Sapphire as the two lights. */
export function HomeScreen() {
  return (
    <SideScope side="garnet">
      <HomeContent />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  round: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: -6, right: -8 },
  dock: { paddingTop: 12, paddingBottom: 14, paddingHorizontal: 14 },
  dockHint: { textAlign: "center" },
  pair: { alignItems: "stretch" },
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  self: { alignSelf: "flex-start" },
  clocks: { paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: "center" },
  incoming: { position: "absolute", top: 8, alignSelf: "center" },
  capsule: { paddingHorizontal: 14, paddingVertical: 8 },
  signals: { flexDirection: "row", justifyContent: "space-between" },
  moreCol: { alignItems: "center", gap: 6, minWidth: 64 },
  more: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  moment: { paddingHorizontal: 14, minHeight: 50 },
  time: { width: 42 },
  card: { width: 156, padding: 16 },
});
