import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Segmented } from "@/components/ui/Segmented";
import type { SurpriseView } from "@/domain/surprises";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { useTheme } from "@/theme/ThemeProvider";
import { GiftCapsule, type GiftState } from "./components/GiftCapsule";
import { useSurprises } from "./useSurprises";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER } from "@/theme/transitions";

type Shown = Exclude<SurpriseView, { kind: "unavailable" }>;

function giftState(s: Shown): GiftState {
  switch (s.kind) {
    case "locked":
      return s.ready && !s.fromMe ? "ready" : "locked";
    case "opened":
      return "opened";
    case "cancelled":
    case "failed":
      return "withdrawn";
  }
}

function status(s: Shown, partner: string): { text: string; strong: boolean } {
  switch (s.kind) {
    case "locked":
      return s.fromMe
        ? { text: s.ready ? `Ready for ${partner}` : "Scheduled", strong: false }
        : s.ready
          ? { text: "Ready", strong: true }
          : { text: "Scheduled", strong: false };
    case "opened":
      return { text: "Opened", strong: false };
    case "cancelled":
      return { text: "Withdrawn", strong: false };
    case "failed":
      return { text: "Not scheduled yet", strong: true };
  }
}

/**
 * SUR-01 · The surprise library (prompt 12), the third part of Moments: "For me" and "From me",
 * each surprise a glass card with its gift capsule, its safe title (never what's inside), who
 * it's from and a status. A floating "Create surprise". Empty states say where they'll wait.
 */
export function SurprisesSection() {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const data = useSurprises().data;
  const me = useHomeToday().data?.me;
  const [tab, setTab] = useState<"forMe" | "fromMe">("forMe");
  const partner = data?.partnerName ?? "your partner";
  const shown = (data?.items ?? []).filter(
    (s): s is Shown =>
      s.kind !== "unavailable" &&
      (tab === "fromMe" ? s.kind === "failed" || s.fromMe : s.kind !== "failed" && !s.fromMe),
  );
  return (
    <View style={{ gap: spacing.lg }}>
      <Segmented
        label="Surprises"
        options={[
          { label: "For me", value: "forMe" },
          { label: "From me", value: "fromMe" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {data === undefined ? (
        <Skeleton kind="grid" />
      ) : shown.length === 0 ? (
        <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.lg }]}>
          <CharacterSlot
            character={me?.side ?? "garnet"}
            look={{ mood: "dreamy", occasion: "everyday" }}
            size={160}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            {tab === "forMe"
              ? `Surprises from ${partner} will wait here.`
              : `Plan something for ${partner}. It stays hidden until it opens.`}
          </AppText>
        </View>
      ) : (
        <View style={[styles.grid, { rowGap: spacing.md }]}>
          {shown.map((s) => {
            const st = status(s, partner);
            const g = giftState(s);
            return (
              <Animated.View
                key={s.id}
                style={styles.half}
                {...(reduceMotion
                  ? {}
                  : {
                      entering: ENTER,
                    })}
              >
                <Pressable
                  onPress={() => {
                    router.push({ pathname: "/moments/surprises/[id]", params: { id: s.id } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.title}. ${tab === "fromMe" ? `For ${partner}` : `From ${partner}`}. ${st.text}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Glass
                    radius={radii.xl}
                    tint={g === "ready" ? "garnet" : "none"}
                    contentStyle={[styles.card, { padding: spacing.md, gap: spacing.sm }]}
                  >
                    <GiftCapsule state={g} size="sm" />
                    <AppText variant="callout" serif style={styles.textCenter} numberOfLines={2}>
                      {s.title}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {tab === "fromMe" ? `For ${partner}` : `From ${partner}`}
                    </AppText>
                    <View
                      style={[
                        styles.chip,
                        { backgroundColor: st.strong ? colors.accentSoft : colors.glassVeilSoft },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="600"
                        color={st.strong ? "accent" : "textSecondary"}
                      >
                        {st.text}
                      </AppText>
                    </View>
                  </Glass>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
      <Button
        label="Create surprise"
        onPress={() => {
          router.push("/moments/surprises/new");
        }}
      />
      <AppText variant="caption" color="textTertiary" style={styles.textCenter}>
        {`Nothing inside is shown before it opens: ${partner} sees only the title you choose.`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  half: { width: "48%" },
  card: { alignItems: "center", minHeight: 230, justifyContent: "center" },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
});
