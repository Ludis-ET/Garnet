import { useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { Temporal } from "temporal-polyfill";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DemoArt } from "@/data/fixtures/demoDays";
import type { PlaceView, SongView } from "@/data/repositories/types";
import { isSongLink } from "@/domain/surprises";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { palette } from "@/theme/tokens";
import {
  useAddPlace,
  useAddSong,
  useDeletePlace,
  useDeleteSong,
  usePlaces,
  useSongs,
} from "./useTogether";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER } from "@/theme/transitions";

const day = (iso: string) =>
  Temporal.PlainDate.from(iso).toLocaleString("en-GB", { day: "numeric", month: "short" });

function Frame({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <GlassScreen
      wash="none"
      tabBar
      onBack={() => {
        goBack("/our-world");
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="largeTitle" serif>
          {title}
        </AppText>
        <AppText variant="callout" color="textSecondary">
          {intro}
        </AppText>
      </View>
      {children}
    </GlassScreen>
  );
}

/** An illustrated map: soft land, a dotted path and a pin per place. Not a live map, ever. */
function MapPlaceholder({ count }: { count: number }) {
  const { colors, radii } = useTheme();
  const [w, setW] = useState(0);
  const h = 170;
  const pins = Array.from({ length: Math.max(1, count) }, (_, i) => ({
    x: w * (0.15 + ((i * 0.37) % 0.7)),
    y: h * (0.3 + ((i * 0.53) % 0.45)),
  }));
  return (
    <View
      accessible
      accessibilityLabel={`An illustrated map with ${String(count)} places. Not a live map.`}
      onLayout={(e) => {
        setW(e.nativeEvent.layout.width);
      }}
    >
      <Glass radius={radii.xl} tint="garnet" contentStyle={{ height: h }}>
        {w === 0 ? null : (
          <Svg width={w} height={h}>
            <Path
              d={`M0 ${String(h * 0.7)} C ${String(w * 0.25)} ${String(h * 0.4)}, ${String(w * 0.5)} ${String(h * 0.95)}, ${String(w)} ${String(h * 0.55)} L ${String(w)} ${String(h)} L 0 ${String(h)} Z`}
              fill={`${palette.sapphire400}22`}
            />
            <Path
              d={`M0 ${String(h * 0.35)} C ${String(w * 0.3)} ${String(h * 0.1)}, ${String(w * 0.6)} ${String(h * 0.55)}, ${String(w)} ${String(h * 0.25)}`}
              stroke={`${palette.ruby400}55`}
              strokeWidth={14}
              fill="none"
            />
            <Path
              d={pins
                .map((p, i) => `${i === 0 ? "M" : "L"} ${String(p.x)} ${String(p.y)}`)
                .join(" ")}
              stroke={colors.accent}
              strokeWidth={2}
              strokeDasharray="2 6"
              strokeLinecap="round"
              fill="none"
            />
            {pins.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={7} fill={colors.accent} />
            ))}
          </Svg>
        )}
        <View style={styles.mapNote}>
          <AppText variant="caption" color="textSecondary">
            An illustrated map · never live location
          </AppText>
        </View>
      </Glass>
    </View>
  );
}

/**
 * PLACE-01 · Places (prompt 13): places saved as memories, an illustrated map (not a live map,
 * not tracking), and "📍 I'm here today", which adds a place you name yourself (P-21). Tap one
 * for its picture and note.
 */
export function PlacesScreen() {
  const { radii, spacing, reduceMotion } = useTheme();
  const toast = useToast();
  const places = usePlaces().data;
  const add = useAddPlace();
  const remove = useDeletePlace();
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState<PlaceView | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [art, setArt] = useState<DemoArt | null>(null);
  return (
    <Frame title="Places" intro="Places that mean something, saved as memories.">
      <MapPlaceholder count={places?.length ?? 0} />
      <Button
        label="📍 I'm here today"
        onPress={() => {
          setName("");
          setNote("");
          setArt(null);
          setAdding(true);
        }}
      />
      {places === undefined ? (
        <Skeleton kind="timeline" />
      ) : places.length === 0 ? (
        <AppText variant="callout" color="textSecondary">
          Save a place you want to remember.
        </AppText>
      ) : (
        places.map((p) => (
          <Animated.View
            key={p.id}
            {...(reduceMotion
              ? {}
              : {
                  entering: ENTER,
                })}
          >
            <Pressable
              onPress={() => {
                setOpen(p);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}. ${day(p.date)}, added by ${p.by}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <Glass
                radius={radii.xl}
                contentStyle={[styles.row, { padding: spacing.sm, gap: spacing.md }]}
              >
                {p.art === null ? (
                  <View style={styles.thumb}>
                    <AppText variant="title">📍</AppText>
                  </View>
                ) : (
                  <View style={styles.thumb}>
                    <MediaArt art={p.art} height={64} radius={radii.lg} />
                  </View>
                )}
                <View style={[styles.flex, { gap: 2 }]}>
                  <AppText variant="headline" numberOfLines={1}>
                    {p.name}
                  </AppText>
                  <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                    {p.note}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {day(p.date)} · {p.by}
                  </AppText>
                </View>
              </Glass>
            </Pressable>
          </Animated.View>
        ))
      )}

      <Sheet
        visible={adding && !picking}
        title="I'm here today"
        onClose={() => {
          setAdding(false);
        }}
        footer={
          <Button
            label="Save place"
            loading={add.isPending}
            disabled={name.trim().length === 0}
            onPress={() => {
              add.mutate(
                { name, note, art },
                {
                  onSuccess: () => {
                    setAdding(false);
                    toast.show("Place saved.", "success");
                  },
                  onError: (e: unknown) => {
                    toast.show(serviceErrorMessage(e), "error");
                  },
                },
              );
            }}
          />
        }
      >
        <AppText variant="footnote" color="textSecondary">
          Only what you write here is saved. Garnet doesn't use your location for places.
        </AppText>
        <TextField
          label="Place name"
          icon="pin"
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder="The river bridge"
        />
        <TextField
          label="A short note"
          value={note}
          onChangeText={setNote}
          rows={2}
          maxLength={200}
        />
        {art === null ? (
          <Button
            label="Add a photo"
            variant="secondary"
            onPress={() => {
              setPicking(true);
            }}
          />
        ) : (
          <MediaArt art={art} height={120} radius={radii.lg} />
        )}
      </Sheet>
      {picking ? (
        <MediaPickerSheet
          visible
          onPick={(m) => {
            if (m.type !== "voice") setArt(m.art);
            setPicking(false);
          }}
          onVoice={() => {
            setPicking(false);
          }}
          onClose={() => {
            setPicking(false);
          }}
        />
      ) : null}
      <Sheet
        visible={open !== null && !confirm}
        title={open?.name ?? ""}
        onClose={() => {
          setOpen(null);
        }}
        {...(open?.mine === true
          ? {
              footer: (
                <Button
                  label="Delete place"
                  variant="text"
                  onPress={() => {
                    setConfirm(true);
                  }}
                />
              ),
            }
          : {})}
      >
        {open?.art === null || open === null ? null : (
          <MediaArt art={open.art} height={200} radius={radii.lg} />
        )}
        <AppText variant="body" serif>
          {open?.note}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {open === null ? "" : `${day(open.date)} · added by ${open.by}`}
        </AppText>
      </Sheet>
      <ActionSheet
        visible={confirm}
        title="Delete this place?"
        body="It's removed for both of you."
        icon="trash"
        confirmLabel="Delete"
        destructive
        onCancel={() => {
          setConfirm(false);
        }}
        onConfirm={() => {
          if (open !== null) remove.mutate(open.id);
          setConfirm(false);
          setOpen(null);
        }}
      />
    </Frame>
  );
}

/** A small square of colour standing in for album art (decorative). */
function Artwork({ seed }: { seed: string }) {
  const hues = [
    palette.ruby400,
    palette.violet500,
    palette.sapphire400,
    palette.violet400,
    palette.ruby500,
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  const color = hues[Math.abs(h) % hues.length] ?? palette.violet500;
  return (
    <View style={[styles.art, { backgroundColor: color }]}>
      <AppText variant="title" accessible={false}>
        🎵
      </AppText>
    </View>
  );
}

/**
 * SONG-01 · Our soundtrack (prompt 13): songs with a note and who added them; a song opens an
 * external link card ("Open in your music app"). Garnet keeps the link, never audio.
 */
export function SoundtrackScreen() {
  const { radii, spacing, reduceMotion } = useTheme();
  const toast = useToast();
  const songs = useSongs().data;
  const add = useAddSong();
  const remove = useDeleteSong();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<SongView | null>(null);
  const [form, setForm] = useState({ title: "", artist: "", link: "", note: "" });
  const linkBad = form.link.length > 0 && !isSongLink(form.link);
  return (
    <Frame title="Our soundtrack" intro="The songs that sound like the two of you.">
      <Button
        label="Add a song"
        onPress={() => {
          setForm({ title: "", artist: "", link: "", note: "" });
          setAdding(true);
        }}
      />
      {songs === undefined ? (
        <Skeleton kind="timeline" />
      ) : songs.length === 0 ? (
        <AppText variant="callout" color="textSecondary">
          Add the first song of your soundtrack.
        </AppText>
      ) : (
        songs.map((s) => (
          <Animated.View
            key={s.id}
            {...(reduceMotion
              ? {}
              : {
                  entering: ENTER,
                })}
          >
            <Pressable
              onPress={() => {
                setOpen(s);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}${s.artist.length > 0 ? ` by ${s.artist}` : ""}. Added by ${s.by}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <Glass
                radius={radii.xl}
                contentStyle={[styles.row, { padding: spacing.md, gap: spacing.md }]}
              >
                <Artwork seed={s.id} />
                <View style={[styles.flex, { gap: 2 }]}>
                  <AppText variant="headline" numberOfLines={1}>
                    {s.title}
                  </AppText>
                  <AppText variant="footnote" color="textSecondary" numberOfLines={1}>
                    {s.artist}
                  </AppText>
                  {s.note.length === 0 ? null : (
                    <AppText variant="caption" color="textTertiary" numberOfLines={2} italic>
                      “{s.note}” · {s.by}
                    </AppText>
                  )}
                </View>
              </Glass>
            </Pressable>
          </Animated.View>
        ))
      )}

      <Sheet
        visible={adding}
        title="Add a song"
        onClose={() => {
          setAdding(false);
        }}
        footer={
          <Button
            label="Add to our soundtrack"
            loading={add.isPending}
            disabled={form.title.trim().length === 0 || !isSongLink(form.link)}
            onPress={() => {
              add.mutate(form, {
                onSuccess: () => {
                  setAdding(false);
                  toast.show("Added to your soundtrack 🎵", "success");
                },
                onError: (e: unknown) => {
                  toast.show(serviceErrorMessage(e), "error");
                },
              });
            }}
          />
        }
      >
        <TextField
          label="Link"
          icon="share"
          value={form.link}
          onChangeText={(link) => {
            setForm({ ...form, link });
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://"
          {...(linkBad ? { error: "Use a full https:// link." } : {})}
        />
        <TextField
          label="Title"
          value={form.title}
          onChangeText={(title) => {
            setForm({ ...form, title });
          }}
          maxLength={80}
        />
        <TextField
          label="Artist"
          value={form.artist}
          onChangeText={(artist) => {
            setForm({ ...form, artist });
          }}
          maxLength={80}
        />
        <TextField
          label="A note"
          value={form.note}
          onChangeText={(note) => {
            setForm({ ...form, note });
          }}
          rows={2}
          maxLength={200}
          placeholder="I thought of you on the way home"
        />
      </Sheet>
      <Sheet
        visible={open !== null}
        title={open?.title ?? ""}
        onClose={() => {
          setOpen(null);
        }}
        {...(open?.mine === true
          ? {
              footer: (
                <Button
                  label="Remove from soundtrack"
                  variant="text"
                  onPress={() => {
                    remove.mutate(open.id);
                    setOpen(null);
                  }}
                />
              ),
            }
          : {})}
      >
        {open === null ? null : (
          <>
            <View style={[styles.row, { gap: spacing.md }]}>
              <Artwork seed={open.id} />
              <View style={styles.flex}>
                <AppText variant="headline">{open.title}</AppText>
                <AppText variant="footnote" color="textSecondary">
                  {open.artist}
                </AppText>
              </View>
            </View>
            {open.note.length === 0 ? null : (
              <AppText variant="body" serif italic>
                “{open.note}” · {open.by}
              </AppText>
            )}
            <Pressable
              onPress={() => {
                if (isSongLink(open.link)) void Linking.openURL(open.link);
              }}
              accessibilityRole="link"
              accessibilityLabel={`Open ${open.title} in your music app`}
            >
              <Glass
                radius={radii.lg}
                tint="garnet"
                contentStyle={[styles.row, { padding: spacing.md, gap: spacing.sm }]}
              >
                <Icon name="share" size={18} color={palette.violet500} />
                <View style={styles.flex}>
                  <AppText variant="callout" weight="600">
                    Open in your music app
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {open.link}
                  </AppText>
                </View>
              </Glass>
            </Pressable>
          </>
        )}
      </Sheet>
    </Frame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  art: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mapNote: { position: "absolute", left: 14, bottom: 10 },
});
