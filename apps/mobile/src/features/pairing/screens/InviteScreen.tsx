/**
 * PAIR-02 · Your invitation, and PAIR-06 · your person joined (Daylight Glass, P-49). The code
 * is single-use and expires after 24 hours (P-18, proposed; P-50). The inviter sees it again on
 * any phone (P-97). Sharing uses the phone's own share sheet with a message laid out for
 * messengers; "How your person joins" walks them through it. Delivery by code is an assumption;
 * U-33 (link, code or both) stays open.
 */
import * as Clipboard from "expo-clipboard";
import { Haptics } from "@/components/ui/haptics";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Share, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { SimulatedBadge } from "@/components/ui/SimulatedBadge";
import { useToast } from "@/components/ui/Toast";
import { formatInviteCode, INVITE_POLICY_P18, inviteShareMessage } from "@/domain/pairing";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { usePairingDemo } from "@/features/prototype/demoActions";
import { useTheme } from "@/theme/ThemeProvider";
import { AvatarLink } from "../components/Avatar";
import { InviteTicket } from "../components/InviteTicket";
import { useCreateInvite, usePairingStatus, useRevokeInvite } from "../usePairing";
import { useTimeLeft } from "../useTimeLeft";
import { goBack } from "@/navigation/goBack";
import { ENTER } from "@/theme/transitions";
import { API_AREAS_ON } from "@/data/http/config";

export function InviteScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const status = usePairingStatus(true, 2500);
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const demo = usePairingDemo();
  const [copied, setCopied] = useState(0);
  const [sheet, setSheet] = useState<"share" | "revoke" | null>(null);
  // PAIR-06 shows only when this screen saw the invitation and then the partner joined.
  const [sawInvite, setSawInvite] = useState(false);
  const data = status.data;
  const timeLeft = useTimeLeft(data?.kind === "inviting" ? data.expiresAt : null);
  if (data?.kind === "inviting" && !sawInvite) setSawInvite(true);

  const handleShare = async () => {
    if (data?.kind !== "inviting") return;
    const message = inviteShareMessage(data.me, data.code, INVITE_POLICY_P18);
    if (Platform.OS !== "web") {
      try {
        await Share.share(
          { message, title: "Your Garnet invitation" },
          { dialogTitle: "Share your invitation", subject: `${data.me} invited you to Garnet` },
        );
        return;
      } catch {
        // Fallback to modal if native share tray fails
      }
    }
    setSheet("share");
  };

  if (data === undefined) {
    return (
      <GlassScreen>
        <View style={styles.fill}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  }
  if (data.kind === "paired" && !sawInvite) return <Redirect href="/pair/already" />;
  if (data.kind === "unpaired") return <Redirect href="/pair" />;
  if (data.kind === "reviewing") return <Redirect href="/pair/review" />;

  if (data.kind === "paired") {
    return (
      <GlassScreen
        footer={
          <Button
            label="Continue"
            onPress={() => {
              router.replace("/pair/connected");
            }}
          />
        }
      >
        <View style={styles.fill}>
          <Animated.View {...(reduceMotion ? {} : { entering: ENTER })} style={styles.full}>
            <Glass
              radius={radii.xl + 4}
              contentStyle={[styles.joined, { padding: spacing.xl, gap: spacing.lg }]}
            >
              <View>
                <AvatarLink left={data.me} right={data.partnerName} connected />
                <SparkleBurst play />
              </View>
              <AppText variant="question" style={styles.centerText}>
                {data.partnerName} joined your space.
              </AppText>
              <AppText variant="body" color="textSecondary" style={styles.centerText}>
                It's just the two of you in here.
              </AppText>
            </Glass>
          </Animated.View>
        </View>
      </GlassScreen>
    );
  }

  const { code } = data;
  const expired = data.expired || timeLeft === null;
  // An invitation made before the server kept codes, on a phone that no longer has it: say so
  // and offer a fresh one, instead of empty tiles.
  const lost = !expired && code === "";
  const copy = async (text: string, message: string) => {
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    toast.show(message, "success");
  };
  const renew = () => {
    create.mutate(undefined, {
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  return (
    <GlassScreen
      onBack={() => {
        goBack("/pair");
      }}
      footer={
        expired || lost ? (
          <Button
            label={lost ? "Make a fresh code" : "Create a new one"}
            onPress={renew}
            loading={create.isPending}
          />
        ) : (
          <>
            <Button
              label="Share invitation"
              onPress={() => {
                void handleShare();
              }}
            />
            <View style={[styles.pair, { gap: spacing.sm }]}>
              <View style={styles.half}>
                <Button
                  label="Copy code"
                  variant="secondary"
                  onPress={() => {
                    setCopied((n) => n + 1);
                    void copy(formatInviteCode(code), "Code copied");
                  }}
                />
              </View>
              <View style={styles.half}>
                <Button
                  label="Copy message"
                  variant="secondary"
                  onPress={() => {
                    void copy(
                      inviteShareMessage(data.me, code, INVITE_POLICY_P18),
                      "Message copied",
                    );
                  }}
                />
              </View>
            </View>
            <Button
              label="Revoke invitation"
              variant="text"
              onPress={() => {
                setSheet("revoke");
              }}
            />
          </>
        )
      }
    >
      <Animated.View {...(reduceMotion ? {} : { entering: ENTER })} style={{ gap: spacing.sm }}>
        <AppText variant="largeTitle">Your invitation</AppText>
        <AppText variant="body" color="textSecondary">
          {lost
            ? "This code was made before Garnet kept it for you. Make a fresh one to share; the old one stops working."
            : "Send this to your person. Only they can use it, and only once."}
        </AppText>
      </Animated.View>

      {lost ? null : (
        <InviteTicket
          code={code}
          timeLeft={expired ? null : timeLeft}
          expired={expired}
          copiedKey={copied === 0 ? undefined : copied}
          onCopy={() => {
            setCopied((n) => n + 1);
            void copy(formatInviteCode(code), "Code copied");
          }}
        />
      )}

      {expired || lost ? null : <JoinSteps />}

      {expired || lost ? null : (
        <View style={{ gap: spacing.md }}>
          <AvatarLink left={data.me} right={null} connected={false} />
          <AppText
            variant="callout"
            color="textSecondary"
            style={styles.centerText}
            accessibilityRole="text"
          >
            Waiting for your person to join…
          </AppText>
          {API_AREAS_ON.has("pairing") ? null : (
            <Button
              label="Simulate your person joining (demo)"
              variant="subtle"
              onPress={demo.partnerJoins}
            />
          )}
        </View>
      )}

      <ActionSheet
        visible={sheet === "share"}
        icon="share"
        title="Share preview"
        body={inviteShareMessage(data.me, code, INVITE_POLICY_P18)}
        confirmLabel="Copy message"
        cancelLabel="Done"
        onCancel={() => {
          setSheet(null);
        }}
        onConfirm={() => {
          setSheet(null);
          void copy(inviteShareMessage(data.me, code, INVITE_POLICY_P18), "Message copied");
        }}
      >
        {API_AREAS_ON.has("pairing") ? null : <SimulatedBadge text="Simulated — nothing is sent" />}
      </ActionSheet>
      <ActionSheet
        visible={sheet === "revoke"}
        icon="clock"
        destructive
        title="Revoke this invitation?"
        body="The code will stop working right away."
        confirmLabel="Revoke"
        confirming={revoke.isPending}
        onCancel={() => {
          setSheet(null);
        }}
        onConfirm={() => {
          revoke.mutate(undefined, {
            onSuccess: () => {
              setSheet(null);
              toast.show("Invitation revoked.");
              router.replace("/pair");
            },
            onError: (e) => {
              toast.show(serviceErrorMessage(e), "error");
            },
          });
        }}
      />
    </GlassScreen>
  );
}

/** PAIR-02: what the person receiving the code does, in three short steps. */
function JoinSteps() {
  const { colors, radii, spacing } = useTheme();
  const steps = [
    "Install Garnet and create an account",
    "Choose “I have an invitation”",
    "Enter the code to open your space together",
  ];
  return (
    <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <AppText variant="headline" accessibilityRole="header">
        How your person joins
      </AppText>
      {steps.map((step, i) => (
        <View key={step} style={[styles.step, { gap: spacing.md }]}>
          <View style={[styles.stepDot, { backgroundColor: colors.accent }]}>
            <AppText variant="footnote" weight="600" color="onAccent">
              {String(i + 1)}
            </AppText>
          </View>
          <AppText variant="callout" style={styles.stepText}>
            {step}
          </AppText>
        </View>
      ))}
    </Glass>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row" },
  half: { flex: 1 },
  step: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1 },
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  full: { alignSelf: "stretch" },
  joined: { alignItems: "center" },
  centerText: { textAlign: "center" },
});
