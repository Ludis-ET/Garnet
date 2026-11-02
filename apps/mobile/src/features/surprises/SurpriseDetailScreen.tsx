import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Temporal } from "temporal-polyfill";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { revealWords } from "@/domain/surprises";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useHomeToday, useSendSignal } from "@/features/home/useHome";
import { SaveMemorySheet } from "@/features/memories/components/SaveMemorySheet";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { GiftCapsule } from "./components/GiftCapsule";
import { SurpriseContentView } from "./components/SurpriseContentView";
import {
  useCancelSurprise,
  useOpenSurprise,
  useRetitleSurprise,
  useRetrySurprise,
  useSurprise,
} from "./useSurprises";
import { ENTER } from "@/theme/transitions";

/**
 * SUR-05 to SUR-07 · One surprise (prompt 12, Daylight Glass). Locked: the capsule, its safe
 * title and when it opens; the recipient sees nothing inside and no hints. The sender sees
 * what's inside, plus provisional "Change the title" and "Cancel surprise" ("rules not final",
 * P-68). Ready: "Open your surprise?", then the ribbon unwraps (≤ 1.2 s, tap to skip; a
 * cross-fade under reduced motion) and the content shows with "Save as memory" and "Send a
 * thought back". Withdrawn, unavailable and a (simulated) scheduling error are calm, no blame.
 */
export function SurpriseDetailScreen({ id }: { id: string }) {
  const { spacing, radii, reduceMotion } = useTheme();
  const toast = useToast();
  const view = useSurprise(id).data;
  const people = useHomeToday().data;
  const openIt = useOpenSurprise();
  const cancel = useCancelSurprise();
  const retitle = useRetitleSurprise();
  const retry = useRetrySurprise();
  const sendThought = useSendSignal();
  const [dialog, setDialog] = useState<"open" | "cancel" | "title" | "memory" | null>(null);
  const [title, setTitle] = useState("");
  const [revealing, setRevealing] = useState(false);
  const unwrap = useSharedValue(0);
  const partner = people?.partner.name ?? "your partner";
  const me = people?.me.name ?? "you";
  const zone = people?.me.zone ?? "UTC";
  const now = Temporal.Now.instant();
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const finish = () => {
    setRevealing(false);
  };
  useEffect(() => {
    if (!revealing) return;
    if (reduceMotion) {
      unwrap.set(1);
      const t = setTimeout(finish, 300);
      return () => {
        clearTimeout(t);
      };
    }
    unwrap.set(0);
    unwrap.set(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done === true) scheduleOnRN(finish);
      }),
    );
    return undefined;
  }, [revealing, reduceMotion, unwrap]);

  const frame = (children: ReactNode) => (
    <GlassScreen
      wash="none"
      tabBar
      onBack={() => {
        goBack("/moments/surprises");
      }}
      header={
        <AppText variant="headline" style={styles.center}>
          Surprise
        </AppText>
      }
      headerRight={<View style={styles.side} />}
    >
      {children}
    </GlassScreen>
  );

  if (view === undefined) return frame(<ActivityIndicator accessibilityLabel="Loading" />);
  if (view.kind === "unavailable")
    return frame(
      <Glass radius={radii.xl} contentStyle={[styles.hero, { gap: spacing.sm }]}>
        <GiftCapsule state="withdrawn" size="md" />
        <AppText variant="headline" style={styles.center}>
          This item isn't available here.
        </AppText>
      </Glass>,
    );

  // The unwrap plays over the content as it arrives (SUR-06).
  if (revealing)
    return frame(
      <Pressable
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip"
        style={[styles.reveal, { gap: spacing.lg }]}
      >
        <GiftCapsule state="ready" size="lg" open={unwrap} />
        {reduceMotion ? null : <SparkleBurst play />}
        <AppText variant="title" serif style={styles.center}>
          {view.title}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          Tap to skip
        </AppText>
      </Pressable>,
    );

  const hero = (state: "locked" | "ready" | "opened" | "withdrawn", lines: readonly string[]) => (
    <Animated.View {...(reduceMotion ? {} : { entering: ENTER })}>
      <Glass
        radius={radii.xl + 4}
        tint={state === "ready" ? "garnet" : "none"}
        contentStyle={[styles.hero, { gap: spacing.sm }]}
      >
        <GiftCapsule state={state} size="lg" />
        <AppText variant="title" serif style={styles.center}>
          {view.title}
        </AppText>
        {lines.map((l) => (
          <AppText key={l} variant="footnote" color="textSecondary" style={styles.center}>
            {l}
          </AppText>
        ))}
      </Glass>
    </Animated.View>
  );

  return frame(
    <>
      {view.kind === "locked" && !view.fromMe ? (
        <>
          {hero(view.ready ? "ready" : "locked", [
            `From ${partner}`,
            view.ready ? "Ready when you are" : revealWords(view.reveal, now.toString(), zone, now),
          ])}
          {view.ready ? (
            <Button
              label="Open your surprise"
              onPress={() => {
                setDialog("open");
              }}
            />
          ) : (
            <Notice
              tone="info"
              icon="lock"
              text="No peeking: nothing inside shows until it opens."
            />
          )}
        </>
      ) : null}

      {view.kind === "locked" && view.fromMe ? (
        <>
          {hero("locked", [
            `For ${partner}`,
            view.ready
              ? `Ready for ${partner} now`
              : revealWords(view.reveal, now.toString(), zone, now),
          ])}
          {view.content === null ? null : (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="footnote" weight="600" color="textSecondary">
                Inside (only you can see this until it opens)
              </AppText>
              <SurpriseContentView
                content={view.content}
                authorName={me}
                recipientName={partner}
                at={now.toString()}
              />
            </View>
          )}
          <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <View style={[styles.row, { gap: spacing.xs }]}>
              <AppText variant="headline" style={styles.flex}>
                Change your mind?
              </AppText>
              <View style={styles.pill}>
                <AppText variant="caption" weight="600" color="accent">
                  Rules not final
                </AppText>
              </View>
            </View>
            <Button
              label="Change the title"
              variant="secondary"
              onPress={() => {
                setTitle(view.safeTitle ?? "");
                setDialog("title");
              }}
            />
            <Button
              label="Cancel surprise"
              variant="text"
              onPress={() => {
                setDialog("cancel");
              }}
            />
          </Glass>
        </>
      ) : null}

      {view.kind === "opened" ? (
        <>
          {hero("opened", [
            view.fromMe ? `${partner} opened it` : `From ${partner}`,
            Temporal.Instant.from(view.openedAt)
              .toZonedDateTimeISO(zone)
              .toPlainDate()
              .toLocaleString("en-GB", { day: "numeric", month: "long" }),
          ])}
          <Animated.View entering={ENTER}>
            <SurpriseContentView
              content={view.content}
              authorName={view.fromMe ? me : partner}
              recipientName={view.fromMe ? partner : me}
              at={view.openedAt}
            />
          </Animated.View>
          {view.fromMe ? null : (
            <View style={{ gap: spacing.sm }}>
              {view.content.media !== null && view.content.media.type !== "voice" ? (
                <Button
                  label="Save as memory"
                  variant="secondary"
                  onPress={() => {
                    setDialog("memory");
                  }}
                />
              ) : null}
              <Button
                label="Send a thought back"
                loading={sendThought.isPending}
                onPress={() => {
                  sendThought.mutate("thought-of-you", {
                    onSuccess: () => {
                      toast.show(`Sent ${partner} a little thought 💭`, "success");
                    },
                    onError,
                  });
                }}
              />
            </View>
          )}
        </>
      ) : null}

      {view.kind === "cancelled"
        ? hero("withdrawn", [
            view.fromMe ? "You withdrew this surprise." : "This surprise was withdrawn.",
          ])
        : null}

      {view.kind === "failed" ? (
        <>
          {hero("withdrawn", [`For ${partner}`])}
          <Notice tone="info" icon="refresh" text="Couldn't schedule this yet. Try again." />
          <Button
            label="Try again"
            loading={retry.isPending}
            onPress={() => {
              retry.mutate(view.id, {
                onSuccess: () => {
                  toast.show("Scheduled 🎁", "success");
                },
                onError: () => {
                  toast.show("Couldn't schedule this yet. Try again.", "error");
                },
              });
            }}
          />
          <SurpriseContentView
            content={view.content}
            authorName={me}
            recipientName={partner}
            at={now.toString()}
          />
        </>
      ) : null}

      <ActionSheet
        visible={dialog === "open"}
        title="Open your surprise?"
        body={`From ${partner}. It stays here once opened.`}
        art={<GiftCapsule state="ready" size="sm" />}
        confirmLabel="Open"
        cancelLabel="Not now"
        confirming={openIt.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          openIt.mutate(view.id, {
            onSuccess: () => {
              setDialog(null);
              setRevealing(true);
            },
            onError: (e) => {
              setDialog(null);
              onError(e);
            },
          });
        }}
      />
      <ActionSheet
        visible={dialog === "cancel"}
        title="Cancel this surprise?"
        body={`${partner} will see it was withdrawn, never what was inside. (Rules not final.)`}
        icon="x"
        confirmLabel="Cancel surprise"
        cancelLabel="Keep it"
        destructive
        confirming={cancel.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          cancel.mutate(view.id, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Surprise withdrawn.");
            },
            onError,
          });
        }}
      />
      <Sheet
        visible={dialog === "title"}
        title="Title before opening"
        onClose={() => {
          setDialog(null);
        }}
        footer={
          <Button
            label="Save"
            loading={retitle.isPending}
            onPress={() => {
              retitle.mutate(
                { id: view.id, title: title.trim().length === 0 ? null : title },
                {
                  onSuccess: () => {
                    setDialog(null);
                    toast.show("Title saved.");
                  },
                  onError,
                },
              );
            }}
          />
        }
      >
        <TextField
          label="Safe title"
          value={title}
          onChangeText={setTitle}
          maxLength={40}
          placeholder="Something for you"
          helper="Nothing about what's inside. Leave empty for the generic title."
        />
      </Sheet>
      {dialog === "memory" && view.kind === "opened" ? (
        <SaveMemorySheet
          media={view.content.media}
          title={view.title}
          story={view.content.text}
          date={Temporal.Instant.from(view.openedAt)
            .toZonedDateTimeISO(zone)
            .toPlainDate()
            .toString()}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </>,
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  side: { width: 44, height: 44 },
  hero: { alignItems: "center", padding: 24 },
  reveal: { alignItems: "center", justifyContent: "center", minHeight: 420 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
