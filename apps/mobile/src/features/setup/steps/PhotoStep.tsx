/**
 * SETUP-04 · Your picture (P-98). Initials on a swatch from the side's family, or a real photo:
 * chosen from the gallery through the system picker (cropped square, made small on the phone),
 * or, for a Google account, the account's own picture already there. "Remove photo" goes back to
 * initials and deletes the stored picture. Garnet works without a photo.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import type { AvatarChoice } from "@/data/fixtures/demoProfile";
import type { GemSide } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { useTheme } from "@/theme/ThemeProvider";
import { avatarSwatches } from "@/theme/tokens";
import { ProfileAvatar, sideColor } from "../components/ProfileAvatar";
import { pickPicture } from "../pickPicture";
import { useClearPicture, useSetPicture } from "../useSetup";

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
  const toast = useToast();
  const setPicture = useSetPicture();
  const clearPicture = useClearPicture();
  const [picking, setPicking] = useState(false);
  const hasPhoto = avatar.kind === "image";
  const [mode, setMode] = useState<"initials" | "photo">(hasPhoto ? "photo" : "initials");
  const family = avatarSwatches[side ?? "garnet"];
  const ring = sideColor(side);
  const busy = picking || setPicture.isPending || clearPicture.isPending;

  const choosePhoto = async () => {
    setPicking(true);
    const picked = await pickPicture();
    setPicking(false);
    if (!picked.ok) {
      if (picked.reason === "failed")
        toast.show("That photo couldn't be used. Please try another one.", "error");
      return;
    }
    setPicture.mutate(
      { base64: picked.base64 },
      {
        onSuccess: (next) => {
          onAvatar(next);
        },
        onError: (e) => {
          toast.show(serviceErrorMessage(e), "error");
        },
      },
    );
  };

  /** Initials replace a photo: the stored photo is removed too (P-98). */
  const chooseInitials = (swatch: number) => {
    const next: AvatarChoice = { kind: "initials", swatch };
    if (avatar.kind !== "image") {
      onAvatar(next);
      return;
    }
    clearPicture.mutate(undefined, {
      onSuccess: () => {
        onAvatar(next);
      },
      onError: (e) => {
        toast.show(serviceErrorMessage(e), "error");
      },
    });
  };

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
        onChange={setMode}
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
                  chooseInitials(i);
                }}
                disabled={busy}
                accessibilityRole="radio"
                accessibilityLabel={swatch.name}
                accessibilityState={{ checked: selected, disabled: busy }}
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
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button
            label={hasPhoto ? "Choose another photo" : "Choose from your photos"}
            variant="secondary"
            loading={busy}
            onPress={() => {
              void choosePhoto();
            }}
          />
          {hasPhoto ? (
            <Button
              label="Remove photo"
              variant="text"
              disabled={busy}
              onPress={() => {
                chooseInitials(0);
                setMode("initials");
              }}
            />
          ) : null}
          <AppText variant="footnote" color="textSecondary" style={styles.textCenter}>
            Only the photo you choose is used, and only you and your person see it.
          </AppText>
        </View>
      )}
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
});
