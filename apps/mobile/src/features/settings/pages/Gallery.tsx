import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Glass } from "@/components/ui/Glass";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import { SettingsPage, SettingsSection } from "../components/SettingsList";

export type Size = "small" | "medium" | "large";
export interface Look {
  bg: readonly [string, string];
  ink: string;
  soft: string;
  pane: string;
}

export const LIGHT: Look = {
  bg: ["#FFFFFF", "#F1ECFB"],
  ink: "#15131C",
  soft: "#575266",
  pane: "rgba(123,85,240,0.10)",
};
export const DARK: Look = {
  bg: ["#221C33", "#151021"],
  ink: "#FFFFFF",
  soft: "rgba(255,255,255,0.72)",
  pane: "rgba(255,255,255,0.10)",
};

/** One widget at a size, drawn on its own (widgets have their own surface, not the app's glass). */
export function WidgetFrame({
  size,
  look,
  android,
  stale,
  label,
  children,
}: {
  size: Size;
  look: Look;
  android: boolean;
  stale: boolean;
  label: string;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const full = Math.min(width - 64, 340);
  const s =
    size === "small"
      ? { w: full * 0.47, h: full * 0.47 }
      : size === "medium"
        ? { w: full, h: full * 0.47 }
        : { w: full, h: full };
  return (
    <View
      accessible
      accessibilityLabel={`Widget preview: ${label}`}
      style={[styles.widget, { width: s.w, height: s.h, borderRadius: android ? 28 : 22 }]}
    >
      <LinearGradient colors={look.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.widgetInner}>{children}</View>
      {stale ? (
        <AppText variant="caption" style={[styles.stale, { color: look.soft }]}>
          Updated 14:05
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * WIDGET-01 to WIDGET-07 · Widget gallery (prompt 17): in-app previews, not real widgets.
 * Every widget stays privacy-neutral (§5): no message, moment, memory or event words, nothing
 * about the partner beyond a gentle generic line. Quick actions ask before anything sends.
 * Sizes, iOS/Android, light/dark, stale data and a missing picture.
 */
export function SimpleWidgets() {
  const toast = useToast();
  const { spacing } = useTheme();
  const partner = useHomeToday().data?.partner.name ?? "Noah";
  const [size, setSize] = useState<Size>("medium");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const [stale, setStale] = useState(false);
  const [noImage, setNoImage] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const look = scheme === "dark" ? DARK : LIGHT;
  const android = platform === "android";
  const frame = { size, look, android, stale };
  const big = size !== "small";
  const text = (
    t: string,
    soft = false,
    variant: "caption" | "footnote" | "headline" = "footnote",
  ) => (
    <AppText
      variant={variant}
      weight={soft ? "400" : "600"}
      style={{ color: soft ? look.soft : look.ink }}
      numberOfLines={2}
    >
      {t}
    </AppText>
  );
  return (
    <>
      <Segmented
        label="Size"
        options={[
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ]}
        value={size}
        onChange={setSize}
      />
      <Segmented
        label="Platform"
        options={[
          { label: "iOS", value: "ios" },
          { label: "Android", value: "android" },
        ]}
        value={platform}
        onChange={setPlatform}
      />
      <Segmented
        label="Widget scheme"
        options={[
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]}
        value={scheme}
        onChange={setScheme}
      />
      <SettingsSection footer="Widgets never show words from your messages, moments, letters or memories.">
        <View style={[styles.toggleRow, { padding: spacing.md }]}>
          <AppText variant="callout" style={styles.flex}>
            Show as not updated lately
          </AppText>
          <Toggle
            value={stale}
            onValueChange={setStale}
            accessibilityLabel="Show as not updated lately"
          />
        </View>
        <View style={[styles.toggleRow, { padding: spacing.md }]}>
          <AppText variant="callout" style={styles.flex}>
            Picture missing
          </AppText>
          <Toggle value={noImage} onValueChange={setNoImage} accessibilityLabel="Picture missing" />
        </View>
      </SettingsSection>

      <View style={[styles.wall, { gap: spacing.lg }]}>
        {/* WIDGET-02 · Shared-space hero */}
        <WidgetFrame {...frame} label="Garnet, something waiting for you">
          <View style={[styles.row, { gap: 10 }]}>
            <GarnetMark size={big ? 54 : 40} animated={false} />
            {big ? (
              <View style={styles.flex}>
                {text("Garnet ❤️", false, "headline")}
                {text("Something waiting for you.", true)}
              </View>
            ) : null}
          </View>
          {big ? null : text("Something waiting for you.", true, "caption")}
        </WidgetFrame>

        {/* WIDGET-03 · Shared memory, privacy-neutral */}
        <WidgetFrame {...frame} label="A memory to revisit">
          {noImage ? (
            <View style={[styles.fillCenter, { backgroundColor: look.pane, borderRadius: 16 }]}>
              <AppText variant="title" accessible={false}>
                📸
              </AppText>
            </View>
          ) : (
            <LinearGradient
              colors={[palette.ruby200, palette.violet400, palette.sapphire400]}
              style={[styles.fillCenter, { borderRadius: 16 }]}
            />
          )}
          {text("A memory to revisit", false)}
          {big ? text("From a few weeks ago", true, "caption") : null}
        </WidgetFrame>

        {/* WIDGET-04 · Quick action: asks before sending */}
        <WidgetFrame {...frame} label="Quick actions">
          {text("Garnet", true, "caption")}
          <View style={[styles.row, styles.between, { gap: 6 }]}>
            {(big ? ["💭 Thought", "🥺 Missing", "✍️ Log"] : ["💭", "🥺"]).map((a) => (
              <Pressable
                key={a}
                onPress={() => {
                  setConfirm(a);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Quick action ${a}`}
                style={[styles.action, { backgroundColor: look.pane }]}
              >
                <AppText variant="footnote" weight="600" style={{ color: look.ink }}>
                  {a}
                </AppText>
              </Pressable>
            ))}
          </View>
        </WidgetFrame>

        {/* WIDGET-05 · Today: counts only, never words */}
        <WidgetFrame {...frame} label="Today">
          {text("Today", false, "headline")}
          {text("Your day is filling up ✨", true)}
          {big ? text("Open Days to see it", true, "caption") : null}
        </WidgetFrame>

        {/* WIDGET-06 · Event: when, never what */}
        <WidgetFrame {...frame} label="Something coming up">
          <AppText variant="title" accessible={false}>
            📅
          </AppText>
          {text("Something special", false)}
          {text("In 5 days", true)}
        </WidgetFrame>

        {/* WIDGET-07 · Lock-screen concept */}
        <View
          accessible
          accessibilityLabel="Lock-screen widget preview: Garnet, something new"
          style={[
            styles.lock,
            {
              backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(20,10,30,0.08)",
            },
          ]}
        >
          <GarnetMark size={22} animated={false} />
          <AppText
            variant="footnote"
            weight="600"
            style={{ color: scheme === "dark" ? "#FFFFFF" : "#15131C" }}
          >
            Something new
          </AppText>
        </View>
      </View>

      <ActionSheet
        visible={confirm !== null}
        title="Send this?"
        body={`${confirm ?? ""} to ${partner}. From a widget, Garnet always asks first. (Simulated: nothing is sent.)`}
        icon="send"
        confirmLabel="Send"
        onCancel={() => {
          setConfirm(null);
        }}
        onConfirm={() => {
          setConfirm(null);
          toast.show("Prototype: nothing was sent.");
        }}
      />
    </>
  );
}

const OVERLAYS: readonly {
  label: string;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  destructive?: boolean;
}[] = [
  {
    label: "Discard changes",
    title: "Discard changes?",
    body: "What you wrote won't be kept.",
    confirm: "Discard",
    cancel: "Keep editing",
    destructive: true,
  },
  {
    label: "Delete a memory",
    title: "Delete this memory?",
    body: "It's removed for both of you, with its picture and note.",
    confirm: "Delete",
    cancel: "Cancel",
    destructive: true,
  },
  {
    label: "Notification permission",
    title: "Let Garnet send notifications?",
    body: "So you know when something arrives. You can change this anytime.",
    confirm: "Continue",
    cancel: "Not now",
  },
  {
    label: "Media permission",
    title: "Let Garnet see your photos?",
    body: "Only the ones you pick. You can give limited access.",
    confirm: "Continue",
    cancel: "Not now",
  },
  {
    label: "Session expired",
    title: "Please sign in again",
    body: "For your privacy, your session ended. Nothing you wrote is lost.",
    confirm: "Sign in",
    cancel: "Later",
  },
  {
    label: "Expired invitation",
    title: "This invitation has expired",
    body: "Ask for a new one. Invitations last 24 hours.",
    confirm: "OK",
    cancel: "Close",
  },
];

const TOASTS: readonly { label: string; text: string; tone: "info" | "success" | "error" }[] = [
  { label: "Saved", text: "Saved to your day.", tone: "success" },
  { label: "Draft", text: "Draft saved on this device.", tone: "info" },
  {
    label: "Waiting to sync",
    text: "Waiting to sync when you're back online. (Simulated)",
    tone: "info",
  },
  { label: "Didn't work", text: "That didn't work. Try again.", tone: "error" },
  {
    label: "Permission denied",
    text: "Garnet can work without this permission. You can enable it in Settings later.",
    tone: "info",
  },
  { label: "Removed", text: "Removed from this view.", tone: "info" },
  { label: "Already sent", text: "Already sent.", tone: "info" },
  { label: "Update ready", text: "A new version is ready — restart when you like.", tone: "info" },
];

const EMPTIES: readonly { where: string; line: string }[] = [
  { where: "Days", line: "Your days will gather here, one small moment at a time." },
  { where: "Memories", line: "Your story starts with one memory." },
  { where: "Letters", line: "Leave something for the days apart." },
  { where: "Search", line: "Nothing found. Try another word or filter." },
];

/**
 * SYS-01 to SYS-04 · Overlays and states board (prompt 16), live: every overlay opens over a
 * dimmed screen and closes on a tap outside; each toast plays; skeletons, an error, an
 * unavailable item and the empty states are shown as they appear in the app.
 */
export function StatesBoardPage() {
  const toast = useToast();
  const { radii, spacing } = useTheme();
  const me = useHomeToday().data?.me;
  const [open, setOpen] = useState<(typeof OVERLAYS)[number] | null>(null);
  const [skeleton, setSkeleton] = useState<"timeline" | "grid" | "detail">("timeline");
  return (
    <SettingsPage
      title="Overlays & states"
      intro="Every pop-up, message and state, to review in one place."
    >
      <SettingsSection title="Overlays (tap outside to close)">
        <View style={[styles.wrap, { gap: spacing.xs, padding: spacing.md }]}>
          {OVERLAYS.map((o) => (
            <Button
              key={o.label}
              label={o.label}
              variant="secondary"
              style={styles.half}
              onPress={() => {
                setOpen(o);
              }}
            />
          ))}
        </View>
      </SettingsSection>
      <SettingsSection title="Toasts and banners">
        <View style={[styles.wrap, { gap: spacing.xs, padding: spacing.md }]}>
          {TOASTS.map((t) => (
            <Button
              key={t.label}
              label={t.label}
              variant="secondary"
              style={styles.half}
              onPress={() => {
                toast.show(t.text, t.tone);
              }}
            />
          ))}
        </View>
      </SettingsSection>
      <AppText variant="footnote" weight="600" color="textSecondary">
        LOADING
      </AppText>
      <Segmented
        label="Skeleton"
        options={[
          { label: "Timeline", value: "timeline" },
          { label: "Grid", value: "grid" },
          { label: "Detail", value: "detail" },
        ]}
        value={skeleton}
        onChange={setSkeleton}
      />
      <Skeleton key={skeleton} kind={skeleton} />
      <AppText variant="footnote" weight="600" color="textSecondary">
        ERRORS
      </AppText>
      <ErrorState
        onRetry={() => {
          toast.show("Trying again…");
        }}
      />
      <Glass radius={radii.xl} contentStyle={[styles.center, { padding: spacing.lg }]}>
        <AppText variant="callout" color="textSecondary">
          This item isn't available here.
        </AppText>
      </Glass>
      <AppText variant="footnote" weight="600" color="textSecondary">
        EMPTY STATES
      </AppText>
      {EMPTIES.map((e) => (
        <Glass
          key={e.where}
          radius={radii.xl}
          contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
        >
          <CharacterSlot
            character={me?.side ?? "garnet"}
            look={{ mood: "dreamy", occasion: "everyday" }}
            size={72}
            aspectRatio={FRAME_ASPECT}
          />
          <View style={styles.flex}>
            <AppText variant="caption" weight="600" color="textTertiary">
              {e.where.toUpperCase()}
            </AppText>
            <AppText variant="callout">{e.line}</AppText>
          </View>
        </Glass>
      ))}
      <ActionSheet
        visible={open !== null}
        title={open?.title ?? ""}
        body={open?.body ?? ""}
        icon={open?.destructive === true ? "trash" : "info"}
        confirmLabel={open?.confirm ?? "OK"}
        cancelLabel={open?.cancel ?? "Cancel"}
        destructive={open?.destructive === true}
        onCancel={() => {
          setOpen(null);
        }}
        onConfirm={() => {
          setOpen(null);
          toast.show("Prototype: nothing changed.");
        }}
      />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  between: { justifyContent: "space-between" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  half: { width: "48.5%" },
  center: { alignItems: "center" },
  fillCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  wall: { alignItems: "center" },
  widget: {
    overflow: "hidden",
    shadowColor: "#2B1240",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  widgetInner: { flex: 1, padding: 14, gap: 6, justifyContent: "flex-end" },
  stale: { position: "absolute", top: 10, right: 14 },
  action: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14 },
  lock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
