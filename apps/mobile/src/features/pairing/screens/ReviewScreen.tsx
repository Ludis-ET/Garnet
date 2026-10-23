/**
 * PAIR-04 · Review the invitation (Daylight Glass, P-49). Shows only the inviter's chosen
 * display name, never their email. Accepting spends the invitation (P-18, proposed); if it
 * stopped being valid, the one calm message from PAIR-03 is shown and the person starts over.
 */
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { InfoList } from "@/components/ui/InfoList";
import { useToast } from "@/components/ui/Toast";
import { INVITE_NOT_VALID_MESSAGE } from "@/domain/pairing";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useTheme } from "@/theme/ThemeProvider";
import { AvatarLink } from "../components/Avatar";
import { useAcceptInvite, useDeclineInvite, usePairingStatus } from "../usePairing";

export function ReviewScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, reduceMotion } = useTheme();
  const status = usePairingStatus();
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();
  const [declining, setDeclining] = useState(false);
  const data = status.data;

  if (data === undefined) {
    return (
      <GlassScreen>
        <View style={styles.fill}>
          <ActivityIndicator color={colors.accent} accessibilityLabel="Loading" />
        </View>
      </GlassScreen>
    );
  }
  // Accepting navigates on its own; an already-paired person who lands here sees PAIR-07.
  if (data.kind === "paired" && !accept.isSuccess) return <Redirect href="/pair/already" />;
  if (data.kind !== "reviewing" && data.kind !== "paired") return <Redirect href="/pair" />;
  const inviter = data.kind === "reviewing" ? data.inviterName : data.partnerName;

  const onAccept = () => {
    accept.mutate(undefined, {
      onSuccess: (result) => {
        if (result.ok) router.replace("/pair/connected");
        else {
          toast.show(INVITE_NOT_VALID_MESSAGE, "error");
          router.replace("/pair");
        }
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

  return (
    <GlassScreen
      footer={
        <>
          <Button label="Accept and connect" onPress={onAccept} loading={accept.isPending} />
          <Button
            label="Decline"
            variant="text"
            disabled={accept.isPending}
            onPress={() => {
              setDeclining(true);
            }}
          />
        </>
      }
    >
      <View style={[styles.center, { gap: spacing.xl, marginTop: spacing.xl }]}>
        <AvatarLink left={inviter} right={data.me} connected={false} />
        <Animated.View
          {...(reduceMotion ? {} : { entering: FadeInDown.delay(100).springify().damping(18) })}
          style={{ gap: spacing.xs }}
        >
          <AppText variant="largeTitle" style={styles.centerText}>
            {inviter} invited you
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.centerText}>
            to a private space for two.
          </AppText>
        </Animated.View>
      </View>
      <InfoList
        items={[
          { icon: "lock", text: "Only the two of you can see what's inside" },
          { icon: "sign-out", text: "You can leave at any time" },
          { icon: "shield", text: "No ads, and your data is never sold" },
        ]}
      />
      <View style={[styles.note, { gap: spacing.xs }]}>
        <Icon name="info" size={15} color={colors.textTertiary} />
        <AppText variant="footnote" color="textTertiary">
          Only accept if you know this person.
        </AppText>
      </View>

      <ActionSheet
        visible={declining}
        icon="x"
        destructive
        title="Decline this invitation?"
        body={`You can always ask ${inviter} for a new one.`}
        confirmLabel="Decline"
        confirming={decline.isPending}
        onCancel={() => {
          setDeclining(false);
        }}
        onConfirm={() => {
          decline.mutate(undefined, {
            onSuccess: () => {
              setDeclining(false);
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
  center: { alignItems: "center" },
  centerText: { textAlign: "center" },
  note: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
