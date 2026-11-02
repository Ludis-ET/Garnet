/**
 * SETUP-04 · Your picture. Initials on a swatch from the side's family, or a demo "photo"
 * through a simulated permission flow: rationale first, then a clearly badged system prompt
 * (Phase 2 never asks the real OS; rule 4). Denying is fine: Garnet works without it.
 */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { SimulatedPrompt } from "@/components/ui/SimulatedPrompt";
import { DEMO_PHOTOS, type AvatarChoice } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { useTheme } from "@/theme/ThemeProvider";
import { avatarSwatches, demoPhotoArt } from "@/theme/tokens";
import { ProfileAvatar, sideColor } from "../components/ProfileAvatar";

type Access = "unknown" | "granted" | "denied";

export function PhotoStep({
  name,
  side,
  avatar,
  onAvatar,
}: {
  name: string;
  side: GemSide | null;
  avatar: AvatarChoice;
  onAvatar: (a: AvatarChoice) => void;
}) {
  const { colors, spacing } = useTheme();
  const [mode, setMode] = useState<"initials" | "photo">(avatar.kind);
  const [access, setAccess] = useState<Access>(avatar.kind === "photo" ? "granted" : "unknown");
  const [sheet, setSheet] = useState<"rationale" | "prompt" | null>(null);
  const family = avatarSwatches[side ?? "garnet"];
  const ring = sideColor(side);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={styles.center}>
        <ProfileAvatar name={name} avatar={avatar} side={side} size={132} />
      </View>
      <Segmented
        label="Picture"
        options={[
          { label: "Initials", value: "initials" },
          { label: "Photo", value: "photo" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === "initials" && avatar.kind === "photo")
            onAvatar({ kind: "initials", swatch: 0 });
        }}
      />

      {mode === "initials" ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Colour"
          style={[styles.row, { gap: spacing.lg }]}
        >
          {family.map((swatch, i) => {
            const selected = avatar.kind === "initials" && avatar.swatch === i;
            return (
              <Pressable
                key={swatch.name}
                onPress={() => {
                  onAvatar({ kind: "initials", swatch: i });
                }}
                accessibilityRole="radio"
                accessibilityLabel={swatch.name}
                accessibilityState={{ checked: selected }}
                hitSlop={6}
                style={[styles.swatchRing, { borderColor: selected ? ring : "transparent" }]}
              >
                <LinearGradient colors={swatch.colors} style={styles.swatch}>
                  {selected ? <Icon name="check" size={18} color={colors.onAccent} /> : null}
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      ) : access === "granted" ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="footnote" color="textSecondary" style={styles.textCenter}>
            Choose a picture
          </AppText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Pictures"
            style={[styles.row, { gap: spacing.md }]}
          >
            {DEMO_PHOTOS.map((photo) => {
              const selected = avatar.kind === "photo" && avatar.photo === photo;
              return (
                <Pressable
                  key={photo}
                  onPress={() => {
                    onAvatar({ kind: "photo", photo });
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={demoPhotoArt[photo].label}
                  accessibilityState={{ checked: selected }}
                  style={[styles.thumbRing, { borderColor: selected ? ring : colors.glassRimEnd }]}
                >
                  <LinearGradient colors={demoPhotoArt[photo].colors} style={styles.thumb} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Button
            label="Choose a photo"
            variant="secondary"
            onPress={() => {
              setSheet("rationale");
            }}
          />
          {access === "denied" ? (
            <Notice
              icon="lock"
              text="Garnet can work without this permission. You can enable it in Settings later."
            />
          ) : null}
        </View>
      )}

      <ActionSheet
        visible={sheet === "rationale"}
        icon="lock"
        title="Choose a photo"
        body="Garnet only uses the photo you pick. Nothing else in your library is read."
        confirmLabel="Open photo library"
        cancelLabel="Not now"
        onCancel={() => {
          setSheet(null);
        }}
        onConfirm={() => {
          setSheet("prompt");
        }}
      />
      <SimulatedPrompt
        visible={sheet === "prompt"}
        title="“Garnet” would like to access your photos"
        body="Choose the photo for your picture."
        onAllow={() => {
          setSheet(null);
          setAccess("granted");
          onAvatar({ kind: "photo", photo: "sunrise" });
        }}
        onDeny={() => {
          setSheet(null);
          setAccess("denied");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "center" },
  swatchRing: { borderWidth: 2.5, borderRadius: 30, padding: 3 },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRing: { borderWidth: 2.5, borderRadius: 22, padding: 3 },
  thumb: { width: 84, height: 84, borderRadius: 18 },
});
