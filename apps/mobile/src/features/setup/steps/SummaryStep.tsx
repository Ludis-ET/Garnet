/** SETUP-08 · You're all set: the finished card, every answer with a way back, and the partner. */
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import type { DemoPartnerProfile, Profile } from "@/data/fixtures/demoProfile";
import { cityForZone, type SetupStep } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { IdentityCard } from "../components/IdentityCard";
import { ProfileAvatar } from "../components/ProfileAvatar";

const SIDE: Record<"ruby" | "sapphire", string> = { ruby: "❤️ Ruby", sapphire: "💙 Sapphire" };

function rows(p: Profile): readonly { step: SetupStep; label: string; value: string }[] {
  const alerts =
    p.notifications.status === "on"
      ? "On"
      : p.notifications.status === "denied"
        ? "Off (not allowed)"
        : p.notifications.status === "off"
          ? "Off"
          : "Not set";
  return [
    {
      step: "name",
      label: "Name",
      value: p.nickname.trim() ? `${p.displayName} (${p.nickname.trim()})` : p.displayName,
    },
    { step: "side", label: "Side", value: p.side === null ? "Not set" : SIDE[p.side] },
    { step: "photo", label: "Picture", value: p.avatar.kind === "photo" ? "Photo" : "Initials" },
    {
      step: "time",
      label: "Time zone",
      value: p.timeZone === null ? "Not set" : cityForZone(p.timeZone),
    },
    {
      step: "look",
      label: "Look",
      value: `${p.appearance[0]?.toUpperCase() ?? ""}${p.appearance.slice(1)} · ${p.accent === "rich" ? "Rich" : "Subtle"}`,
    },
    { step: "alerts", label: "Alerts", value: alerts },
  ];
}

export function SummaryStep({
  profile,
  partner,
  onEdit,
}: {
  profile: Profile;
  partner: DemoPartnerProfile;
  onEdit: (step: SetupStep) => void;
}) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const enter = (i: number) =>
    reduceMotion
      ? {}
      : {
          entering: FadeInDown.delay(140 + i * 60)
            .springify()
            .damping(18),
        };
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.center}>
        <CharacterSlot character="garnet" pose="holdingCrystal" size={128} aspectRatio={2 / 3} />
        <SparkleBurst play />
      </View>
      <IdentityCard profile={profile} large />

      <Glass radius={radii.xl}>
        {rows(profile).map((row, i) => (
          <Fragment key={row.step}>
            {i === 0 ? null : (
              <View
                style={[
                  styles.divider,
                  { marginLeft: spacing.lg, backgroundColor: colors.glassHairline },
                ]}
              />
            )}
            <Animated.View {...enter(i)}>
              <Pressable
                onPress={() => {
                  onEdit(row.step);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}: ${row.value}. Edit`}
                style={({ pressed }) => [
                  styles.row,
                  { paddingHorizontal: spacing.lg, gap: spacing.md, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <AppText variant="callout" color="textSecondary" style={styles.label}>
                  {row.label}
                </AppText>
                <AppText variant="callout" weight="500" numberOfLines={1} style={styles.value}>
                  {row.value}
                </AppText>
                <Icon name="chevron-right" size={18} color={colors.textTertiary} />
              </Pressable>
            </Animated.View>
          </Fragment>
        ))}
      </Glass>

      <Glass
        radius={radii.xl}
        contentStyle={[styles.row, { padding: spacing.lg, gap: spacing.md }]}
      >
        <ProfileAvatar
          name={partner.name}
          avatar={{ kind: "initials", swatch: 1 }}
          side={partner.side}
          size={44}
        />
        <View style={styles.flex}>
          <AppText variant="callout" weight="600">
            {partner.name}
            {partner.side === null ? "" : ` · ${SIDE[partner.side]}`}
          </AppText>
          <AppText variant="footnote" color="textSecondary">
            {partner.ready ? "Ready" : "Still setting up…"}
          </AppText>
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  flex: { flex: 1 },
  label: { width: 90 },
  value: { flex: 1, textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth },
});
