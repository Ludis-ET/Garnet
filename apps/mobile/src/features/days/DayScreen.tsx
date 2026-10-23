/**
 * DAYS-02 to DAYS-04 · One shared day: my day (in my colour), the partner's day (in theirs) and
 * Together (Garnet). The partner's side shows only what they shared, plus "after our days meet"
 * moments once revealed (§4). Waiting copy never says who hasn't finished (§2, no blame). Recap
 * timing follows the PROVISIONAL policy (both ready; U-06 open).
 */
import { router } from "expo-router";
import { type ReactNode, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { GarnetMark } from "@/components/brand/GarnetMark";
import { SparkleBurst } from "@/components/brand/SparkleBurst";
import { SideCharacter } from "@/components/character/SideCharacter";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet, SheetAction } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import type { DayDetail, EntryView } from "@/data/repositories/types";
import { dayLabel, VISIBILITY_LABEL, type Visibility } from "@/domain/days";
import { cityForZone, localTimeLabel } from "@/domain/identity";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { sideColor } from "@/features/setup/components/ProfileAvatar";
import { useNow } from "@/features/setup/useNow";
import { SideScope, useTheme } from "@/theme/ThemeProvider";
import { ADD_BUTTON_SPACE, AddButton } from "./components/AddButton";
import { BoundarySheet } from "./components/BoundarySheet";
import { MergedTimeline, Timeline } from "./components/Timeline";
import { useDay, useFinishDay, useRemoveEntry, useRetryUpload, useSetVisibility } from "./useDays";

type View3 = "mine" | "partner" | "together";

export function openEntry(entry: EntryView) {
  router.push({ pathname: "/days/entry/[id]", params: { id: entry.id } });
}

export function editEntry(id: string) {
  router.push({ pathname: "/days/new", params: { id } });
}

/** The quiet card while the two days haven't met (DAYS-04 waiting). */
function Waiting({ action }: { action?: ReactNode }) {
  const { radii, spacing } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <Glass
        radius={radii.xl}
        contentStyle={[styles.center, { padding: spacing.xl, gap: spacing.md }]}
      >
        <GarnetMark size={88} progress={1} dim />
        <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
          Your days will meet when you're both ready.
        </AppText>
        {action}
      </Glass>
    </Animated.View>
  );
}

/** DAYS-04 ready: the mark lights up, a few sparkles, one action. */
function Ready({ onSee }: { onSee: () => void }) {
  const { radii, spacing } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)}>
      <Glass
        radius={radii.xl}
        tint="garnet"
        contentStyle={[styles.center, { padding: spacing.xl, gap: spacing.md }]}
      >
        <View>
          <GarnetMark size={92} progress={3} />
          <SparkleBurst play />
        </View>
        <AppText variant="headline" style={styles.textCenter}>
          Your days met ❤️💙
        </AppText>
        <Button label="See our day" onPress={onSee} />
      </Glass>
    </Animated.View>
  );
}

function DayBody({
  day,
  view,
  setView,
}: {
  day: DayDetail;
  view: View3;
  setView: (v: View3) => void;
}) {
  const toast = useToast();
  const { spacing } = useTheme();
  const now = useNow();
  const finish = useFinishDay();
  const retry = useRetryUpload();
  const remove = useRemoveEntry();
  const visibility = useSetVisibility();
  const [menu, setMenu] = useState<EntryView | null>(null);
  const [dialog, setDialog] = useState<"finish" | "delete" | "boundary" | null>(null);
  const { me, partnerPerson: partner } = day;
  const date = Temporal.PlainDate.from(day.date);
  const ready = day.state === "ready";
  const onError = (e: unknown) => {
    toast.show(serviceErrorMessage(e), "error");
  };
  const zone = view === "partner" ? partner.zone : me.zone;
  const merged = [...day.mine, ...day.partner].sort((a, b) =>
    Temporal.Instant.compare(Temporal.Instant.from(a.at), Temporal.Instant.from(b.at)),
  );
  const changeTo = (entry: EntryView, v: Visibility) => {
    setMenu(null);
    visibility.mutate(
      { id: entry.id, visibility: v },
      {
        onSuccess: (r) => {
          toast.show(
            r.ok
              ? v === "shared"
                ? `Shared with ${partner.name}.`
                : VISIBILITY_LABEL[v]
              : "Shared moments stay shared.",
            r.ok ? "success" : "info",
          );
        },
        onError,
      },
    );
  };
  const finishButton =
    day.state === "open" ? (
      <Button
        label="Finish my day"
        variant="text"
        onPress={() => {
          setDialog("finish");
        }}
      />
    ) : null;

  return (
    <>
      <GlassScreen
        tabBar
        onBack={() => {
          router.back();
        }}
        header={
          <AppText variant="headline" style={styles.textCenter}>
            {day.isToday ? "Today" : dayLabel(date)}
          </AppText>
        }
        headerRight={
          <IconButton
            icon="info"
            label="When does a day end?"
            onPress={() => {
              setDialog("boundary");
            }}
          />
        }
      >
        <View style={{ gap: spacing.md }}>
          <Segmented
            label="Whose day"
            options={[
              { label: "My day", value: "mine" },
              { label: partner.name, value: "partner" },
              { label: "Together", value: "together" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "together" ? null : (
            <AppText variant="footnote" color="textSecondary" style={styles.textCenter}>
              {cityForZone(zone)} · {localTimeLabel(now, zone)}
            </AppText>
          )}
        </View>

        {ready && view !== "together" ? (
          <Ready
            onSee={() => {
              setView("together");
            }}
          />
        ) : null}

        {view === "mine" ? (
          <Animated.View key="mine" entering={FadeIn.duration(220)} style={{ gap: spacing.lg }}>
            {day.mine.length === 0 ? (
              <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xl }]}>
                <SideCharacter pose="idle" size={150} />
                <AppText variant="callout" color="textSecondary">
                  Nothing here yet.
                </AppText>
              </View>
            ) : (
              <Timeline
                entries={day.mine}
                viewerZone={me.zone}
                authorZone={me.zone}
                color={sideColor(me.side)}
                onOpen={openEntry}
                onMenu={setMenu}
                onRetry={(e) => {
                  retry.mutate(e.id, {
                    onSuccess: () => {
                      toast.show("Uploading again.");
                    },
                    onError,
                  });
                }}
              />
            )}
            {day.state === "waiting" ? <Waiting /> : finishButton}
          </Animated.View>
        ) : null}

        {view === "partner" ? (
          <Animated.View key="partner" entering={FadeIn.duration(220)} style={{ gap: spacing.lg }}>
            {day.partner.length === 0 ? (
              <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.xl }]}>
                <GarnetMark size={96} progress={ready ? 3 : 1} dim={!ready} />
                <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
                  {ready
                    ? `Nothing shared from ${partner.name} this day.`
                    : `${partner.name}'s day is still theirs for now.`}
                </AppText>
              </View>
            ) : (
              <Timeline
                entries={day.partner}
                viewerZone={me.zone}
                authorZone={partner.zone}
                color={sideColor(partner.side)}
                onOpen={openEntry}
              />
            )}
            {ready || day.partner.length === 0 ? null : (
              <AppText variant="footnote" color="textTertiary" style={styles.textCenter}>
                More may arrive when your days meet.
              </AppText>
            )}
          </Animated.View>
        ) : null}

        {view === "together" ? (
          <Animated.View key="together" entering={FadeIn.duration(220)} style={{ gap: spacing.lg }}>
            {ready ? (
              <MergedTimeline
                entries={merged}
                viewerZone={me.zone}
                zoneOf={(e) => (e.mine ? me.zone : partner.zone)}
                // Ruby on the left, Sapphire on the right; before a side is chosen, the viewer
                // takes the side opposite Sapphire and the partner the other one.
                isLeft={(e) => (e.mine ? me.side !== "sapphire" : me.side === "sapphire")}
                colorOf={(e) => sideColor(e.mine ? me.side : partner.side)}
                onOpen={openEntry}
              />
            ) : (
              <Waiting {...(finishButton === null ? {} : { action: finishButton })} />
            )}
          </Animated.View>
        ) : null}
        {day.isToday && !ready && view === "mine" ? (
          <View style={{ height: ADD_BUTTON_SPACE }} />
        ) : null}
      </GlassScreen>

      {day.isToday && !ready && view === "mine" ? (
        <AddButton
          onPress={() => {
            router.push("/days/new");
          }}
        />
      ) : null}

      <Sheet
        visible={menu !== null && dialog !== "delete"}
        onClose={() => {
          setMenu(null);
        }}
      >
        {menu === null ? null : (
          <View style={{ gap: spacing.xxs }}>
            <SheetAction
              icon="edit"
              label="Edit"
              onPress={() => {
                const id = menu.id;
                setMenu(null);
                editEntry(id);
              }}
            />
            {menu.visibility === "shared" ? null : (
              <SheetAction
                icon="heart"
                label={`Share with ${partner.name}`}
                onPress={() => {
                  changeTo(menu, "shared");
                }}
              />
            )}
            {menu.visibility === "private" ? (
              <SheetAction
                icon="moon"
                label={VISIBILITY_LABEL.afterReveal}
                onPress={() => {
                  changeTo(menu, "afterReveal");
                }}
              />
            ) : null}
            {menu.visibility === "afterReveal" ? (
              <SheetAction
                icon="lock"
                label={VISIBILITY_LABEL.private}
                onPress={() => {
                  changeTo(menu, "private");
                }}
              />
            ) : null}
            <SheetAction
              icon="trash"
              label="Delete"
              destructive
              onPress={() => {
                setDialog("delete");
              }}
            />
          </View>
        )}
      </Sheet>

      <ActionSheet
        visible={dialog === "delete"}
        title="Delete this moment?"
        body={
          menu?.visibility === "shared"
            ? `It's removed for you and ${partner.name}.`
            : "It can't be brought back."
        }
        icon="trash"
        confirmLabel="Delete"
        destructive
        confirming={remove.isPending}
        onCancel={() => {
          setDialog(null);
          setMenu(null);
        }}
        onConfirm={() => {
          if (menu === null) return;
          remove.mutate(menu.id, {
            onSuccess: () => {
              setDialog(null);
              setMenu(null);
              toast.show("Deleted.");
            },
            onError,
          });
        }}
      />
      <ActionSheet
        visible={dialog === "finish"}
        title="Finish your day?"
        body={`It meets ${partner.name}'s when you're both ready.`}
        art={<SideCharacter pose="goodnight" size={120} />}
        confirmLabel="Finish my day"
        confirming={finish.isPending}
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          finish.mutate(day.date, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Your day is ready.", "success");
            },
            onError,
          });
        }}
      />
      <BoundarySheet
        visible={dialog === "boundary"}
        date={day.date}
        people={[me, partner]}
        onClose={() => {
          setDialog(null);
        }}
      />
    </>
  );
}

export function DayScreen({ date }: { date: string }) {
  const day = useDay(date);
  const [view, setView] = useState<View3>("mine");
  const data = day.data;
  if (data === undefined)
    return (
      <SideScope side="garnet">
        <GlassScreen
          tabBar
          onBack={() => {
            router.back();
          }}
        >
          <View style={[styles.center, styles.grow]}>
            <ActivityIndicator accessibilityLabel="Loading" />
          </View>
        </GlassScreen>
      </SideScope>
    );
  // Each view in its owner's colour; Together in Garnet (P-55).
  const side =
    view === "together"
      ? "garnet"
      : ((view === "mine" ? data.me.side : data.partnerPerson.side) ?? "garnet");
  return (
    <SideScope side={side}>
      <View style={styles.fill}>
        <DayBody day={data} view={view} setView={setView} />
      </View>
    </SideScope>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Inside GlassScreen's scroll content: grow, never `flex: 1` (rule 11).
  grow: { flexGrow: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  textCenter: { textAlign: "center" },
});
