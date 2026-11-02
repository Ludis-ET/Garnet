import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Segmented } from "@/components/ui/Segmented";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import {
  EMAIL_TEMPLATES,
  linkLanding,
  plainTextEmail,
  renderEmail,
  type EmailId,
  type LinkState,
} from "@/domain/emails";
import {
  NOTIFICATION_CATALOGUE,
  renderNotification,
  type PreviewMode,
} from "@/domain/notifications";
import {
  DEVICE_FRAMES,
  NotificationMock,
  type DeviceFrame,
} from "@/features/notifications/NotificationMock";
import { useTheme } from "@/theme/ThemeProvider";
import { SettingsPage } from "../components/SettingsList";
import { useSettings } from "../useSettings";

const MODES: readonly { value: PreviewMode; label: string }[] = [
  { value: "generic", label: "Generic" },
  { value: "sender", label: "Sender" },
  { value: "full", label: "Full" },
];

/** NOTIF-02 · Notification preview lab: every catalogue entry in every mode and device frame. */
export function NotificationLabPage() {
  const { colors, radii, spacing } = useTheme();
  const partner = useSettings().data?.partner.name ?? "Noah";
  const [mode, setMode] = useState<PreviewMode>("generic");
  const [frame, setFrame] = useState<DeviceFrame>("ios-lock");
  const [id, setId] = useState(NOTIFICATION_CATALOGUE[0]?.id ?? "thought");
  const spec = NOTIFICATION_CATALOGUE.find((n) => n.id === id) ?? NOTIFICATION_CATALOGUE[0];
  if (spec === undefined) return null;
  const text = renderNotification(spec, mode, {
    sender: partner,
    partner,
    messagePreview: "Thinking of you, call tonight?",
    safePrompt: "Open when you miss me",
    safeTitle: "A little something",
    eventTitle: "Our anniversary",
    when: "Tomorrow, 18:00 for you",
    eventType: "anniversary",
  });
  return (
    <SettingsPage title="Notification lab">
      <SimulatedBadge text="Simulated — no notification is sent" />
      <Segmented label="Privacy mode" options={MODES} value={mode} onChange={setMode} />
      <Segmented label="Device" options={DEVICE_FRAMES} value={frame} onChange={setFrame} />
      <NotificationMock frame={frame} {...text} />
      <AppText variant="footnote" color="textSecondary">
        {spec.label}: {spec.rule}.
      </AppText>
      <Glass radius={radii.xl} contentStyle={{ paddingVertical: spacing.xs }}>
        {NOTIFICATION_CATALOGUE.map((n) => {
          const on = n.id === id;
          return (
            <Pressable
              key={n.id}
              onPress={() => {
                setId(n.id);
              }}
              accessibilityRole="radio"
              accessibilityLabel={n.label}
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: on
                    ? colors.accentSoft
                    : pressed
                      ? colors.glassHighlight
                      : undefined,
                },
              ]}
            >
              <AppText variant="title" accessible={false}>
                {n.emoji}
              </AppText>
              <View style={styles.flex}>
                <AppText variant="callout" weight={on ? "600" : "400"}>
                  {n.label}
                </AppText>
                <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                  {n.title.replace(/\{sender\}/g, partner)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </Glass>
    </SettingsPage>
  );
}

const EMAIL_INK = "#15131C";
const EMAIL_SOFT = "#575266";
const EMAIL_VIOLET = "#7B55F0";

/** EMAIL-01 · Email preview lab (EMAIL-02 layout, EMAIL-03 to EMAIL-13 templates). */
export function EmailLabPage() {
  const { colors, radii, spacing } = useTheme();
  const [id, setId] = useState<EmailId>("verify");
  const [width, setWidth] = useState<"mobile" | "desktop">("mobile");
  const [format, setFormat] = useState<"html" | "text">("html");
  const [images, setImages] = useState<"on" | "blocked">("on");
  const [link, setLink] = useState<LinkState>("valid");
  const template = EMAIL_TEMPLATES.find((t) => t.id === id) ?? EMAIL_TEMPLATES[0];
  if (template === undefined) return null;
  const email = renderEmail(template);
  const landing = linkLanding(link);
  const w = width === "mobile" ? 340 : 600;
  return (
    <SettingsPage title="Email lab">
      <SimulatedBadge />
      <ScrollView
        horizontal
        style={styles.noGrow}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {EMAIL_TEMPLATES.map((t) => {
          const on = t.id === id;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                setId(t.id);
              }}
              accessibilityRole="radio"
              accessibilityLabel={t.type}
              accessibilityState={{ checked: on }}
            >
              <Glass
                radius={radii.pill}
                shadow={false}
                tint={on ? "garnet" : "none"}
                contentStyle={styles.chip}
              >
                <AppText variant="footnote" weight={on ? "600" : "400"}>
                  {t.type}
                </AppText>
              </Glass>
            </Pressable>
          );
        })}
      </ScrollView>
      <Segmented
        label="Width"
        options={[
          { label: "Mobile", value: "mobile" },
          { label: "Desktop", value: "desktop" },
        ]}
        value={width}
        onChange={setWidth}
      />
      <Segmented
        label="Format"
        options={[
          { label: "HTML", value: "html" },
          { label: "Plain text", value: "text" },
        ]}
        value={format}
        onChange={setFormat}
      />
      {format === "html" ? (
        <Segmented
          label="Images"
          options={[
            { label: "Images on", value: "on" },
            { label: "Blocked", value: "blocked" },
          ]}
          value={images}
          onChange={setImages}
        />
      ) : null}

      {/* The inbox row, then the message itself (emails are white, not glass). */}
      <Glass radius={radii.lg} contentStyle={{ padding: spacing.md, gap: 2 }}>
        <AppText variant="caption" color="textTertiary">
          From Garnet · {template.code}
        </AppText>
        <AppText variant="headline">{email.subject}</AppText>
      </Glass>
      <ScrollView
        horizontal
        style={styles.noGrow}
        showsHorizontalScrollIndicator={width === "desktop"}
      >
        <View
          accessible
          accessibilityLabel={`${email.subject}. ${email.body}`}
          style={[styles.email, { width: w, borderColor: colors.glassHairline }]}
        >
          {format === "text" ? (
            <AppText style={styles.mono}>{plainTextEmail(email)}</AppText>
          ) : (
            <View style={styles.emailInner}>
              {images === "on" ? (
                <AppText style={styles.wordmark}>Garnet</AppText>
              ) : (
                <View style={styles.alt}>
                  <AppText style={styles.altText}>[Garnet]</AppText>
                </View>
              )}
              <View style={styles.rule} />
              <AppText style={styles.headline}>{email.headline}</AppText>
              <AppText style={styles.body}>{email.body}</AppText>
              <View style={styles.cta}>
                <AppText style={styles.ctaText}>{email.cta}</AppText>
              </View>
              <AppText style={styles.small}>
                Or paste this link into your browser: {email.link}
              </AppText>
              <View style={styles.divider} />
              <AppText style={styles.small}>{email.footer}</AppText>
              <AppText style={styles.small}>{email.why}</AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <AppText variant="footnote" weight="600" color="textSecondary">
        When the button is tapped
      </AppText>
      <Segmented
        label="Link state"
        options={[
          { label: "Valid", value: "valid" },
          { label: "Expired", value: "expired" },
          { label: "Used", value: "used" },
          { label: "Invalid", value: "invalid" },
          { label: "Signed out", value: "signedOut" },
        ]}
        value={link}
        onChange={setLink}
      />
      <Glass radius={radii.xl} tint="garnet" contentStyle={{ padding: spacing.lg, gap: 4 }}>
        <AppText variant="headline">{landing.title}</AppText>
        <AppText variant="footnote" color="textSecondary">
          {landing.body}
        </AppText>
      </Glass>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // A sideways row must not stretch to fill the column (react-native-web).
  noGrow: { flexGrow: 0 },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  email: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#2B1240",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  emailInner: { padding: 24, gap: 14 },
  wordmark: { fontSize: 24, fontWeight: "700", color: EMAIL_VIOLET, letterSpacing: 0.5 },
  alt: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#B9B3CC",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  altText: { fontSize: 14, color: EMAIL_SOFT },
  rule: { height: 2, backgroundColor: EMAIL_VIOLET, borderRadius: 1 },
  headline: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: EMAIL_INK },
  body: { fontSize: 16, lineHeight: 24, color: EMAIL_INK },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: EMAIL_VIOLET,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 19, color: EMAIL_SOFT },
  divider: { height: 1, backgroundColor: "#ECE9F2" },
  mono: { fontFamily: "monospace", fontSize: 13, lineHeight: 19, color: EMAIL_INK, padding: 20 },
});
