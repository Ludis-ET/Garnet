/**
 * PAIR-02 · Your invitation, and PAIR-06 · your person joined (Daylight Glass, P-49). The code
 * is a simulated, single-use invitation that expires after 24 hours (P-18, proposed; P-50).
 * Sharing is a local preview: nothing leaves the device. Delivery by code is a prototype
 * assumption; U-33 (link, code or both) stays open.
 */
import * as Clipboard from "expo-clipboard";
import { Haptics } from "@/components/ui/haptics";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
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

export function InviteScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const status = usePairingStatus();
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
        expired ? (
          <Button label="Create a new one" onPress={renew} loading={create.isPending} />
        ) : (
          <>
            <Button
              label="Share invitation"
              onPress={() => {
                setSheet("share");
              }}
            />
            <Button
              label="Copy code"
              variant="secondary"
              onPress={() => {
                setCopied((n) => n + 1);
                void copy(formatInviteCode(code), "Code copied");
              }}
            />
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
      </Animated.View>

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

      {expired ? null : (
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
          <Button
            label="Simulate your person joining (demo)"
            variant="subtle"
            onPress={demo.partnerJoins}
          />
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
        <SimulatedBadge text="Simulated — nothing is sent" />
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

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  full: { alignSelf: "stretch" },
  joined: { alignItems: "center" },
  centerText: { textAlign: "center" },
});
