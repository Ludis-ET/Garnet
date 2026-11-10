/**
 * CHAT-01 to CHAT-08 · The private conversation, redesigned in Daylight Glass with Ruby and
 * Sapphire joining in like little avatars (P-58): they wave hello when the chat opens, the
 * partner's character pops up with typing dots while they type (only if they share typing),
 * yours hops when you send, and under your latest message the partner's tiny face says "Seen"
 * — only when BOTH of you said yes to it (U-35 open; asked once, nothing preselected).
 * Nothing claims delivery, presence or "online". Media never becomes a memory on its own.
 */
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Temporal } from "temporal-polyfill";
import { Aurora } from "@/components/brand/Aurora";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { noOutline } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DemoMedia } from "@/data/fixtures/demoDays";
import {
  dateGroupLabel,
  isMessageEditable,
  messagePreview,
  messageState,
  type ChatMessage,
  type ChatSticker,
  type MessageState,
} from "@/domain/chat";
import type { CompanionLook } from "@/domain/companion";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useCompanions } from "@/features/companions/useCompanions";
import { VoiceRecorderSheet } from "@/features/days/components/VoiceRecorderSheet";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useMediaPlayer } from "@/features/media/MediaPlayerContext";
import { SaveMemorySheet } from "@/features/memories/components/SaveMemorySheet";
import { useChatDemo } from "@/features/prototype/demoActions";
import { ProfileAvatar } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { useHomeToday } from "@/features/home/useHome";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { AttachTray } from "./components/AttachTray";
import { Bubble } from "./components/Bubble";
import { ExpressionPanel, QUICK_EMOJI } from "./components/ExpressionPanel";
import { MessageMenu, type MenuAction, type MessageAnchor } from "./components/MessageMenu";
import { MediaComposer } from "./components/MediaComposer";
import { StatusRow } from "./components/StatusRow";
import { gemOf, PeekBubble, PeekCharacter, TypingDots } from "./components/Presence";
import {
  useCancelUpload,
  useChatMessages,
  useChatStream,
  useMarkChatRead,
  useMarkSaved,
  useChatPresence,
  useChatSettings,
  useChatSummary,
  useDeleteMessage,
  useEditMessage,
  useRetryMessage,
  useSearchChat,
  useSendMessage,
  useTogglePin,
  useToggleReaction,
  useUpdateChatSettings,
} from "./useChat";
import { goBack } from "@/navigation/goBack";
import { removeLastGrapheme } from "@/features/emoji/emoji";
import { ENTER } from "@/theme/transitions";
import { useKeyboardVisible } from "@/components/ui/useKeyboardVisible";

/** Messages closer than this (same person) hug each other. */
const GROUP_MINUTES = 5;

type Item =
  | { kind: "date"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: ChatMessage;
      joinAbove: boolean;
      joinBelow: boolean;
      state: MessageState | null;
    };

function buildItems(
  messages: readonly ChatMessage[],
  meId: string,
  now: Temporal.Instant,
  zone: string,
  seenUpTo: string | null,
): Item[] {
  const sorted = [...messages]
    .filter((m) => m.deletedForMe !== true)
    .sort((a, b) =>
      Temporal.Instant.compare(
        Temporal.Instant.from(a.createdAt),
        Temporal.Instant.from(b.createdAt),
      ),
    );
  const close = (a: ChatMessage | undefined, b: ChatMessage | undefined) =>
    a?.senderId !== undefined &&
    a.senderId === b?.senderId &&
    dateGroupLabel(a.createdAt, now, zone) === dateGroupLabel(b.createdAt, now, zone) &&
    Temporal.Instant.from(b.createdAt)
      .since(Temporal.Instant.from(a.createdAt))
      .total({ unit: "minutes" }) <= GROUP_MINUTES;
  const lastMine = [...sorted]
    .reverse()
    .find((m) => m.senderId === meId && m.deletedForEveryone !== true);
  const items: Item[] = [];
  let label = "";
  sorted.forEach((m, i) => {
    const l = dateGroupLabel(m.createdAt, now, zone);
    if (l !== label) {
      items.push({ kind: "date", key: `d-${l}-${m.id}`, label: l });
      label = l;
    }
    // P-61: unfinished or failed sends always show their status; sent/seen only on the latest.
    const state =
      m.senderId === meId && m.deletedForEveryone !== true ? messageState(m, seenUpTo) : null;
    const shown =
      state === null
        ? null
        : state === "sent" || state === "seen"
          ? m.id === lastMine?.id
            ? state
            : null
          : state;
    items.push({
      kind: "msg",
      key: m.id,
      message: m,
      joinAbove: close(sorted[i - 1], m),
      joinBelow: close(m, sorted[i + 1]),
      state: shown,
    });
  });
  return items.reverse(); // newest first for the inverted list
}

function Conversation() {
  useChatStream();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const now = useNow();
  const home = useHomeToday();
  const looks = useCompanions();
  const messages = useChatMessages();
  const summary = useChatSummary();
  const presence = useChatPresence();
  const settings = useChatSettings();
  const send = useSendMessage();
  const edit = useEditMessage();
  const remove = useDeleteMessage();
  const pin = useTogglePin();
  const react = useToggleReaction();
  const retry = useRetryMessage();
  const cancel = useCancelUpload();
  const markSaved = useMarkSaved();
  const markRead = useMarkChatRead();
  const updateSettings = useUpdateChatSettings();
  const demo = useChatDemo();
  const { openMedia } = useMediaPlayer();
  const list = useRef<FlatList<Item>>(null);
  const keyboardUp = useKeyboardVisible();

  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  // Where the held message sits, to lift it in place (CHAT-02, P-63).
  const [held, setHeld] = useState<{
    anchor: MessageAnchor;
    joinAbove: boolean;
    joinBelow: boolean;
  } | null>(null);
  const input = useRef<TextInput>(null);
  const [sheet, setSheet] = useState<
    "delete" | "deleteAll" | "details" | "pinned" | "search" | "media" | "voice" | "memory" | null
  >(null);
  const [preview, setPreview] = useState<Exclude<DemoMedia, { type: "voice" }> | null>(null);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [hello, setHello] = useState(true);
  const [panel, setPanel] = useState(false);
  const [burst, setBurst] = useState<{ key: number; look: CompanionLook } | null>(null);
  const results = useSearchChat(query);

  // Both characters wave when the chat opens, then step back (decorative, not presence).
  useEffect(() => {
    const t = setTimeout(() => {
      setHello(false);
    }, 2200);
    return () => {
      clearTimeout(t);
    };
  }, []);
  // Open on screen means read (this person's own count only; "Seen" stays mutual, P-58).
  const lastId = messages.data?.at(-1)?.id;
  const readNow = useEffectEvent(() => {
    markRead.mutate();
  });
  useEffect(() => {
    if (lastId !== undefined) readNow();
  }, [lastId]);
  // Simulated upload progress (P-61) while anything is still on its way.
  const uploading = (messages.data ?? []).some(
    (m) => m.status === "sending" && m.uploadProgress !== undefined,
  );
  // A stable tick: re-renders (refetches, typing) must not restart the interval.
  const tick = useEffectEvent(() => {
    demo.advanceUploads(0.07);
  });
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      tick();
    }, 220);
    return () => {
      clearInterval(t);
    };
  }, [uploading]);
  useEffect(() => {
    if (burst === null) return;
    const t = setTimeout(() => {
      setBurst(null);
    }, 1500);
    return () => {
      clearTimeout(t);
    };
  }, [burst]);

  const me = home.data?.me;
  const partner = home.data?.partner;
  const meId = summary.data?.viewerId ?? "";
  const seenUpTo = presence.data?.seenUpTo ?? null;
  const items = useMemo(
    () => buildItems(messages.data ?? [], meId, now, me?.zone ?? "UTC", seenUpTo),
    [messages.data, meId, now, me?.zone, seenUpTo],
  );
  const pinned = (messages.data ?? []).filter(
    (m) => m.pinned && m.deletedForEveryone !== true && m.deletedForMe !== true,
  );
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };

  if (me === undefined || partner === undefined || messages.data === undefined || meId === "") {
    return (
      <View style={[styles.fill, styles.center]}>
        <Aurora />
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  }

  const myGem = gemOf(me.side);
  const theirGem = gemOf(partner.side);
  const theirLook =
    theirGem === "sapphire" ? looks.sapphire : theirGem === "ruby" ? looks.ruby : looks.garnet;
  const typing = presence.data?.partnerTyping === true;
  const here = presence.data?.partnerHere === true;

  const jumpTo = (id: string) => {
    const index = items.findIndex((i) => i.key === id);
    setSheet(null);
    if (index < 0) return;
    list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: !reduceMotion });
    setHighlight(id);
    setTimeout(() => {
      setHighlight(null);
    }, 1600);
  };

  const submit = () => {
    const body = text.trim();
    if (body.length === 0) return;
    if (editing !== null) {
      edit.mutate(
        { id: editing.id, text: body },
        {
          onSuccess: () => {
            setEditing(null);
            setText("");
          },
          onError,
        },
      );
      return;
    }
    send.mutate(
      { text: body, ...(replyTo === null ? {} : { replyToId: replyTo.id }) },
      {
        onSuccess: () => {
          setText("");
          setReplyTo(null);
          // Your character hops (with love if the message carries some).
          setBurst({
            key: Date.now(),
            look: /[❤💜💙🥰😘💕]/u.test(body)
              ? { mood: "loving", occasion: "everyday" }
              : { mood: "happy", occasion: "everyday" },
          });
          demo.afterSend();
        },
        onError,
      },
    );
  };

  const sendSticker = (sticker: ChatSticker) => {
    send.mutate(
      { text: "", sticker, ...(replyTo === null ? {} : { replyToId: replyTo.id }) },
      {
        onSuccess: () => {
          setReplyTo(null);
          setBurst({ key: Date.now(), look: { mood: sticker.mood, occasion: "everyday" } });
          demo.afterSend();
        },
        onError,
      },
    );
  };

  const sendMedia = (media: DemoMedia, caption = "") => {
    send.mutate(
      {
        text: "",
        media: caption.length === 0 ? media : { ...media, caption },
      },
      {
        onSuccess: () => {
          setPreview(null);
          setSheet(null);
          setBurst({ key: Date.now(), look: { mood: "proud", occasion: "everyday" } });
          demo.afterSend();
        },
        onError,
      },
    );
  };

  /** The hold menu's actions for one message (only what applies to it). */
  const menuActions = (m: ChatMessage): MenuAction[] => {
    const done = () => {
      setMenu(null);
      setHeld(null);
    };
    return [
      {
        icon: "reply",
        label: "Reply",
        onPress: () => {
          setReplyTo(m);
          setEditing(null);
          done();
          input.current?.focus();
        },
      },
      ...(m.text.length > 0
        ? [
            {
              icon: "copy" as const,
              label: "Copy",
              onPress: () => {
                void Clipboard.setStringAsync(m.text);
                toast.show("Copied.");
                done();
              },
            },
          ]
        : []),
      ...(isMessageEditable(m, meId, now) && m.text.length > 0
        ? [
            {
              icon: "edit" as const,
              label: "Edit",
              onPress: () => {
                setEditing(m);
                setReplyTo(null);
                setText(m.text);
                done();
                input.current?.focus();
              },
            },
          ]
        : []),
      {
        icon: "pin",
        label: m.pinned ? "Unpin" : "Pin",
        onPress: () => {
          pin.mutate(m.id, { onError });
          done();
        },
      },
      ...(m.media !== undefined && m.media.type !== "voice" && m.savedAsMemory !== true
        ? [
            {
              icon: "sparkle" as const,
              label: "Save as memory",
              onPress: () => {
                setSheet("memory");
              },
            },
          ]
        : []),
      {
        icon: "info",
        label: "Details",
        onPress: () => {
          setSheet("details");
        },
      },
      {
        icon: "trash",
        label: "Delete",
        destructive: true,
        onPress: () => {
          setSheet("delete");
        },
      },
    ];
  };

  const rightPeek =
    burst !== null ? (
      <PeekCharacter
        key={`b-${String(burst.key)}`}
        character={myGem}
        look={burst.look}
        size={92}
        side="right"
        bubble={<PeekBubble>💌</PeekBubble>}
      />
    ) : hello ? (
      <PeekCharacter
        key="hello-me"
        character={myGem}
        look={{ mood: "hello", occasion: "everyday" }}
        size={92}
        side="right"
        bubble={<PeekBubble>👋</PeekBubble>}
      />
    ) : focused && text.length > 0 ? (
      <PeekCharacter
        key="me-typing"
        character={myGem}
        look={{ mood: "thinking", occasion: "everyday" }}
        size={78}
        side="right"
      />
    ) : null;
  const leftPeek = typing ? (
    <PeekCharacter
      key="them-typing"
      character={theirGem}
      look={{ mood: "listening", occasion: "everyday" }}
      size={96}
      side="left"
      bubble={
        <PeekBubble>
          <TypingDots color={colors.textSecondary} />
        </PeekBubble>
      }
    />
  ) : here ? (
    <PeekCharacter
      key="them-here"
      character={theirGem}
      look={{ mood: "listening", occasion: "everyday" }}
      size={96}
      side="left"
      bubble={<PeekBubble>👀</PeekBubble>}
    />
  ) : hello ? (
    <PeekCharacter
      key="hello-them"
      character={theirGem}
      look={{ mood: "hello", occasion: "everyday" }}
      size={92}
      side="left"
    />
  ) : null;

  return (
    <View style={styles.fill}>
      <Aurora />
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Glass
          radius={radii.pill}
          contentStyle={[styles.row, styles.headerInner, { gap: spacing.sm }]}
        >
          <IconButton
            icon="chevron-left"
            label="Back"
            onPress={() => {
              goBack("/us");
            }}
          />
          <Pressable
            onPress={() => {
              router.push("/us/chat-details");
            }}
            accessibilityRole="button"
            accessibilityLabel={`${partner.name}, ${localTimeLabel(now, partner.zone)} in ${cityForZone(partner.zone)}. Details`}
            style={[styles.row, styles.flex, { gap: spacing.sm }]}
          >
            <ProfileAvatar
              name={partner.name}
              avatar={partner.avatar ?? { kind: "initials", swatch: 1 }}
              side={partner.side}
              size={40}
            />
            <View style={styles.flex}>
              <AppText variant="headline" numberOfLines={1}>
                {partner.name}
              </AppText>
              {/* One line that changes in place (no overlap while it switches). */}
              <AppText
                variant="caption"
                color={typing || here ? "accent" : "textSecondary"}
                weight={typing || here ? "600" : "400"}
                accessibilityLiveRegion="polite"
              >
                {typing
                  ? "typing…"
                  : here
                    ? "here now"
                    : `${localTimeLabel(now, partner.zone)} in ${cityForZone(partner.zone)}`}
              </AppText>
            </View>
          </Pressable>
          <IconButton
            icon="search"
            label="Search messages"
            onPress={() => {
              setSheet("search");
            }}
          />
        </Glass>
        {pinned.length === 0 ? null : (
          <Animated.View entering={ENTER} style={{ marginTop: spacing.xs }}>
            <Pressable
              onPress={() => {
                setSheet("pinned");
              }}
              accessibilityRole="button"
              accessibilityLabel={`${String(pinned.length)} pinned. Open`}
            >
              <Glass
                radius={radii.pill}
                shadow={false}
                contentStyle={[styles.row, styles.pinned, { gap: spacing.sm }]}
              >
                <Icon name="pin" size={15} color={colors.accent} />
                <AppText variant="footnote" weight="600" color="accent">
                  {pinned.length} pinned
                </AppText>
                <AppText
                  variant="footnote"
                  color="textSecondary"
                  numberOfLines={1}
                  style={styles.flex}
                >
                  {pinned.at(-1)?.text}
                </AppText>
                <Icon name="chevron-right" size={14} color={colors.textTertiary} />
              </Glass>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.fill}
      >
        <View style={styles.fill}>
          <FlatList
            ref={list}
            inverted
            data={items}
            keyExtractor={(i) => i.key}
            contentContainerStyle={{ paddingTop: 120, paddingBottom: spacing.md }}
            onScrollToIndexFailed={() => undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <View style={[styles.center, { paddingVertical: spacing.xl, gap: spacing.sm }]}>
                <View style={[styles.row, styles.duo]}>
                  <CharacterSlot
                    character={theirGem}
                    look={{ mood: "hello", occasion: "everyday" }}
                    size={110}
                    aspectRatio={FRAME_ASPECT}
                  />
                  <CharacterSlot
                    character={myGem}
                    look={{ mood: "hello", occasion: "everyday" }}
                    size={104}
                    aspectRatio={FRAME_ASPECT}
                  />
                </View>
                <AppText variant="headline">Just the two of you 💜</AppText>
                <View style={[styles.row, { gap: 4 }]}>
                  <Icon name="lock" size={12} color={colors.textTertiary} />
                  <AppText variant="caption" color="textTertiary">
                    Private to {me.name} and {partner.name}
                  </AppText>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xl }]}>
                <CharacterSlot
                  character="garnet"
                  look={{ mood: "happy", occasion: "everyday" }}
                  size={140}
                  aspectRatio={FRAME_ASPECT}
                />
                <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
                  Say hello to {partner.name} 💜
                </AppText>
                <View
                  style={[
                    styles.row,
                    { gap: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
                  ]}
                >
                  {["Say good morning ☀️", "Thinking of you ✨", "Send a warm hug 🤗"].map(
                    (starter) => (
                      <Pressable
                        key={starter}
                        onPress={() => {
                          setText(starter);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Send starter: ${starter}`}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                      >
                        <Glass
                          radius={radii.pill}
                          shadow={false}
                          contentStyle={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.xs,
                          }}
                        >
                          <AppText variant="footnote" color="accent" weight="600">
                            {starter}
                          </AppText>
                        </Glass>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            }
            renderItem={({ item }) =>
              item.kind === "date" ? (
                <View style={[styles.center, { marginVertical: spacing.md }]}>
                  <Glass radius={radii.pill} shadow={false} contentStyle={styles.datePill}>
                    <AppText variant="caption" weight="600" color="textSecondary">
                      {item.label}
                    </AppText>
                  </Glass>
                </View>
              ) : (
                <View>
                  <Bubble
                    message={item.message}
                    mine={item.message.senderId === meId}
                    partnerSide={partner.side}
                    zone={me.zone}
                    joinAbove={item.joinAbove}
                    joinBelow={item.joinBelow}
                    highlighted={highlight === item.message.id}
                    onLongPress={(anchor) => {
                      setMenu(item.message);
                      setHeld({ anchor, joinAbove: item.joinAbove, joinBelow: item.joinBelow });
                    }}
                    onOpenMedia={() => {
                      const media = item.message.media;
                      if (media === undefined || media.type === "voice") return;
                      openMedia({
                        type: media.type,
                        art: media.art,
                        caption: media.caption,
                        ...(media.type === "video" ? { seconds: media.seconds } : {}),
                        authorName: item.message.senderId === meId ? me.name : partner.name,
                        at: item.message.createdAt,
                      });
                    }}
                    onRetry={() => {
                      retry.mutate(item.message.id, { onError });
                    }}
                    onCancel={() => {
                      cancel.mutate(item.message.id, {
                        onSuccess: () => {
                          toast.show("Upload cancelled.");
                        },
                        onError,
                      });
                    }}
                    onReact={(emoji) => {
                      react.mutate({ messageId: item.message.id, emoji }, { onError });
                    }}
                  />
                  {item.state === null ? null : (
                    <StatusRow
                      state={item.state}
                      progress={item.message.uploadProgress ?? 0}
                      time={localTimeLabel(Temporal.Instant.from(item.message.createdAt), me.zone)}
                      partnerSide={partner.side}
                      partnerLook={theirLook}
                      onRetry={() => {
                        retry.mutate(item.message.id, { onError });
                      }}
                    />
                  )}
                </View>
              )
            }
          />
          {/* Ruby and Sapphire popping up from behind the composer (decorative). */}
          <View pointerEvents="none" style={styles.peekLayer}>
            {leftPeek}
            {rightPeek}
          </View>
        </View>

        {settings.data?.readReceipts === null ? (
          <Animated.View entering={ENTER} style={{ paddingHorizontal: spacing.md }}>
            <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
              <AppText variant="headline">👀 Show when you've seen messages?</AppText>
              <AppText variant="footnote" color="textSecondary">
                {`"Seen" appears only if ${partner.name} says yes too. You can change this anytime.`}
              </AppText>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <View style={styles.flex}>
                  <Button
                    label="Yes"
                    variant="secondary"
                    onPress={() => {
                      updateSettings.mutate({ readReceipts: true }, { onError });
                    }}
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label="No thanks"
                    variant="secondary"
                    onPress={() => {
                      updateSettings.mutate({ readReceipts: false }, { onError });
                    }}
                  />
                </View>
              </View>
            </Glass>
          </Animated.View>
        ) : null}

        <SafeAreaView
          // With the keyboard up it covers the home-indicator area, so no gap above it (P-75).
          edges={keyboardUp ? [] : ["bottom"]}
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            ...(keyboardUp ? { paddingBottom: spacing.sm } : {}),
          }}
        >
          {replyTo !== null || editing !== null ? (
            <Animated.View entering={ENTER}>
              <Glass
                radius={radii.lg}
                shadow={false}
                contentStyle={[styles.row, styles.replyBar, { gap: spacing.sm }]}
              >
                <View style={[styles.replyMark, { backgroundColor: colors.accent }]} />
                <View style={styles.flex}>
                  <AppText variant="caption" weight="600" color="accent">
                    {editing !== null
                      ? "Editing message"
                      : `Replying to ${replyTo?.senderId === meId ? "yourself" : partner.name}`}
                  </AppText>
                  <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                    {messagePreview(editing ?? replyTo ?? { text: "", media: undefined })}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => {
                    setReplyTo(null);
                    if (editing !== null) setText("");
                    setEditing(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  hitSlop={10}
                >
                  <Icon name="x" size={18} color={colors.textSecondary} />
                </Pressable>
              </Glass>
            </Animated.View>
          ) : null}
          {/* The quick row while typing; with the board open it would only repeat it. */}
          {focused && !panel ? (
            <Animated.View
              {...(reduceMotion ? {} : { entering: ENTER })}
              accessibilityRole="toolbar"
              accessibilityLabel="Quick emoji"
              style={{ marginBottom: spacing.xs }}
            >
              <Glass
                radius={radii.pill}
                shadow={false}
                contentStyle={[styles.row, styles.spread, styles.quick]}
              >
                {QUICK_EMOJI.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      setText((t) => t + e);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${e}`}
                    hitSlop={4}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 1.3 : 1 }] })}
                  >
                    <AppText variant="headline" accessible={false}>
                      {e}
                    </AppText>
                  </Pressable>
                ))}
              </Glass>
            </Animated.View>
          ) : null}
          <Glass radius={26} contentStyle={[styles.row, styles.composer, { gap: spacing.xs }]}>
            <Pressable
              onPress={() => {
                setSheet("media");
              }}
              accessibilityRole="button"
              accessibilityLabel="Add a photo, video or voice note"
              style={styles.round}
            >
              <Icon name="plus" size={22} color={colors.accent} />
            </Pressable>
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              onFocus={() => {
                setFocused(true);
                setPanel(false);
              }}
              onBlur={() => {
                setFocused(false);
              }}
              placeholder="Message"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Message"
              multiline
              maxLength={2000}
              style={[styles.input, noOutline, { color: colors.textPrimary }]}
            />
            <Pressable
              onPress={() => {
                // Like the iPhone: the emoji board takes the keyboard's place.
                if (!panel) input.current?.blur();
                setPanel((p) => !p);
              }}
              accessibilityRole="button"
              accessibilityLabel={panel ? "Close stickers and emoji" : "Stickers and emoji"}
              accessibilityState={{ expanded: panel }}
              style={styles.round}
            >
              <Icon
                name={panel ? "x" : "smile"}
                size={21}
                color={panel ? colors.accent : colors.textSecondary}
              />
            </Pressable>
            {text.trim().length > 0 ? (
              <Pressable
                onPress={submit}
                accessibilityRole="button"
                accessibilityLabel={editing !== null ? "Save edit" : "Send"}
                disabled={send.isPending || edit.isPending}
              >
                <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
                  <LinearGradient
                    colors={[colors.accentStrong, colors.accentStrongEnd]}
                    style={styles.send}
                  >
                    <Icon
                      name={editing !== null ? "check" : "send"}
                      size={18}
                      color={colors.onAccent}
                    />
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setSheet("voice");
                }}
                accessibilityRole="button"
                accessibilityLabel="Record a voice note"
                style={styles.round}
              >
                <Icon name="mic" size={21} color={colors.textSecondary} />
              </Pressable>
            )}
          </Glass>
          {panel ? (
            <ExpressionPanel
              mySide={me.side ?? "garnet"}
              onEmoji={(e) => {
                setText((t) => t + e);
              }}
              onBackspace={() => {
                setText((t) => removeLastGrapheme(t));
              }}
              onKeyboard={() => {
                setPanel(false);
                input.current?.focus();
              }}
              onSticker={sendSticker}
            />
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* CHAT-02 · hold or right-click: reactions above, actions below (P-63) */}
      {menu !== null && held !== null && sheet === null ? (
        <MessageMenu
          anchor={held.anchor}
          mine={menu.senderId === meId}
          reacted={menu.reactions.filter((r) => r.reactedByMe).map((r) => r.emoji)}
          actions={menuActions(menu)}
          onReact={(emoji) => {
            react.mutate({ messageId: menu.id, emoji }, { onError });
          }}
          onClose={() => {
            setMenu(null);
            setHeld(null);
          }}
          preview={
            <Bubble
              preview
              message={menu}
              mine={menu.senderId === meId}
              partnerSide={partner.side}
              zone={me.zone}
              joinAbove={held.joinAbove}
              joinBelow={held.joinBelow}
              highlighted={false}
              onLongPress={() => undefined}
              onOpenMedia={() => undefined}
              onRetry={() => undefined}
              onCancel={() => undefined}
              onReact={() => undefined}
            />
          }
        />
      ) : null}

      {/* CHAT-04 · delete for me / for everyone */}
      <Sheet
        visible={sheet === "delete" && menu !== null}
        title="Delete message"
        onClose={() => {
          setSheet(null);
          setMenu(null);
        }}
      >
        <View style={{ gap: spacing.xxs }}>
          <SheetAction
            icon="eye-off"
            label="Delete for you"
            onPress={() => {
              if (menu === null) return;
              remove.mutate(
                { id: menu.id, mode: "for-me" },
                {
                  onSuccess: () => {
                    toast.show("Removed from your view.");
                  },
                  onError,
                },
              );
              setSheet(null);
              setMenu(null);
            }}
          />
          {menu?.senderId === meId ? (
            <SheetAction
              icon="trash"
              label="Delete for everyone"
              destructive
              onPress={() => {
                setSheet("deleteAll");
              }}
            />
          ) : null}
        </View>
      </Sheet>
      <ActionSheet
        visible={sheet === "deleteAll"}
        title="Delete for everyone?"
        body={`This removes it for you and ${partner.name}. It can't remove screenshots or copies outside Garnet.`}
        icon="trash"
        confirmLabel="Delete for everyone"
        destructive
        onCancel={() => {
          setSheet(null);
          setMenu(null);
        }}
        onConfirm={() => {
          if (menu !== null) remove.mutate({ id: menu.id, mode: "for-everyone" }, { onError });
          setSheet(null);
          setMenu(null);
        }}
      />

      {/* CHAT-07 · details: both zones; "Seen" only when both said yes */}
      <Sheet
        visible={sheet === "details" && menu !== null}
        title="Message details"
        onClose={() => {
          setSheet(null);
          setMenu(null);
        }}
      >
        {menu === null ? null : (
          <View style={{ gap: spacing.sm }}>
            <DetailLine
              icon="clock"
              text={`${localTimeLabel(Temporal.Instant.from(menu.createdAt), me.zone)} ${cityForZone(me.zone)} · ${localTimeLabel(Temporal.Instant.from(menu.createdAt), partner.zone)} ${cityForZone(partner.zone)}`}
            />
            {menu.editedAt === null ? null : (
              <DetailLine
                icon="edit"
                text={`Edited at ${localTimeLabel(Temporal.Instant.from(menu.editedAt), me.zone)}`}
              />
            )}
            {menu.senderId === meId ? (
              <DetailLine
                icon="check"
                text={
                  seenUpTo !== null &&
                  Temporal.Instant.compare(
                    Temporal.Instant.from(menu.createdAt),
                    Temporal.Instant.from(seenUpTo),
                  ) <= 0
                    ? "Seen"
                    : "Sent"
                }
              />
            ) : null}
            <AppText variant="footnote" color="textTertiary">
              "Seen" shows only when you both have it on.
            </AppText>
          </View>
        )}
      </Sheet>

      {/* CHAT-05 · pinned */}
      <Sheet
        visible={sheet === "pinned"}
        title="Pinned"
        onClose={() => {
          setSheet(null);
        }}
      >
        {pinned.length === 0 ? (
          <AppText variant="callout" color="textSecondary">
            Pin a message to keep it close.
          </AppText>
        ) : (
          pinned.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                jumpTo(m.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${m.text || "Media"}. Show in chat`}
            >
              <Glass
                radius={radii.lg}
                shadow={false}
                contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
              >
                <Icon name="pin" size={16} color={colors.accent} />
                <AppText variant="callout" style={styles.flex} numberOfLines={2}>
                  {messagePreview(m)}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {dateGroupLabel(m.createdAt, now, me.zone)}
                </AppText>
              </Glass>
            </Pressable>
          ))
        )}
      </Sheet>

      {/* CHAT-06 · search */}
      <Sheet
        visible={sheet === "search"}
        title="Search messages"
        onClose={() => {
          setSheet(null);
          setQuery("");
        }}
      >
        <TextField
          label="Search"
          placeholder="A word or two"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.trim().length === 0 ? null : results.data === undefined ? (
          <ActivityIndicator />
        ) : results.data.length === 0 ? (
          <AppText variant="callout" color="textSecondary">
            Nothing found. Try another word.
          </AppText>
        ) : (
          results.data.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                setQuery("");
                jumpTo(m.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${m.text}. Show in chat`}
            >
              <Glass
                radius={radii.lg}
                shadow={false}
                contentStyle={{ padding: spacing.md, gap: 2 }}
              >
                <AppText variant="callout" numberOfLines={2}>
                  {messagePreview(m)}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  {m.senderId === meId ? "You" : partner.name} ·{" "}
                  {dateGroupLabel(m.createdAt, now, me.zone)}
                </AppText>
              </Glass>
            </Pressable>
          ))
        )}
      </Sheet>

      {/* CHAT-08 · media */}
      {sheet === "media" && preview === null ? (
        <AttachTray
          onPick={setPreview}
          onVoice={() => {
            setSheet("voice");
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {preview === null ? null : (
        <MediaComposer
          media={preview}
          partner={partner}
          sending={send.isPending}
          onSend={(caption) => {
            sendMedia(preview, caption);
          }}
          onClose={() => {
            setPreview(null);
            setSheet(null);
          }}
        />
      )}
      {sheet === "voice" ? (
        <VoiceRecorderSheet
          visible
          onSave={(media) => {
            sendMedia(media);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === "memory" && menu !== null ? (
        <SaveMemorySheet
          media={menu.media ?? null}
          title={menu.media?.caption ?? menu.text.slice(0, 60)}
          story={menu.text}
          date={Temporal.Instant.from(menu.createdAt)
            .toZonedDateTimeISO(me.zone)
            .toPlainDate()
            .toString()}
          onSaved={() => {
            markSaved.mutate(menu.id);
          }}
          onClose={() => {
            setSheet(null);
            setMenu(null);
          }}
        />
      ) : null}
    </View>
  );
}

function DetailLine({ icon, text }: { icon: "clock" | "edit" | "check"; text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md, minHeight: 40 }]}>
      <Icon name={icon} size={18} color={colors.textSecondary} />
      <AppText variant="callout" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

export function ConversationScreen() {
  const home = useHomeToday();
  return (
    <SideScope side={home.data?.me.side ?? "garnet"}>
      <Conversation />
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  textCenter: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  spread: { justifyContent: "space-between" },
  header: { paddingHorizontal: 12, paddingBottom: 6, zIndex: 2 },
  headerInner: { paddingHorizontal: 6, paddingVertical: 6 },
  pinned: { paddingHorizontal: 14, paddingVertical: 8 },
  datePill: { paddingHorizontal: 12, paddingVertical: 4 },
  duo: { alignItems: "flex-end", gap: 0 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 18,
    marginTop: 4,
  },
  face: { width: 24, height: 24, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  // The head of a 2:3 standing figure: crop near the top, centred.
  faceArt: { position: "absolute", top: -9, left: -19 },
  peekLayer: { position: "absolute", left: 0, right: 0, bottom: -18, height: 140 },
  replyBar: { paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  replyMark: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  composer: { paddingHorizontal: 6, paddingVertical: 5, minHeight: 52 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quick: { paddingHorizontal: 14, paddingVertical: 6 },
});
