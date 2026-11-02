import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Temporal } from "temporal-polyfill";
import { CharacterSlot } from "@/components/character/CharacterSlot";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { GlassChip } from "@/components/ui/GlassChip";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DemoArt } from "@/data/fixtures/demoDays";
import type { PlanView } from "@/data/repositories/types";
import {
  PLAN_THEMES,
  planProblem,
  whenWords,
  type PlanTheme,
  type PlanWhen,
} from "@/domain/together";
import { serviceErrorMessage } from "@/features/auth/authUi";
import { MediaArt } from "@/features/days/components/MediaArt";
import { MediaPickerSheet } from "@/features/days/components/MediaPickerSheet";
import { DatePickerSheet } from "@/features/events/components/DatePickerSheet";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useHomeToday } from "@/features/home/useHome";
import { SaveMemorySheet } from "@/features/memories/components/SaveMemorySheet";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { TogetherMoment } from "./components/TogetherMoment";
import { useCompletePlan, useDeletePlan, usePlans, useSavePlan } from "./useTogether";
import { Skeleton } from "@/components/ui/Skeleton";
import { ENTER, LAYOUT } from "@/theme/transitions";

const themeEmoji = (t: PlanTheme) => PLAN_THEMES.find((x) => x.theme === t)?.emoji ?? "✨";

function openPlan(id: string) {
  router.push({ pathname: "/our-world/plan/[id]", params: { id } });
}

/** The page frame for Our World's lists: glass, a Back to Our World, a serif title. */
function Frame({
  title,
  intro,
  children,
  back = "/our-world",
  tabBar = true,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  back?: "/our-world" | "/our-world/plans";
  tabBar?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <GlassScreen
      wash="none"
      tabBar={tabBar}
      onBack={() => {
        goBack(back);
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="largeTitle" serif>
          {title}
        </AppText>
        {intro === undefined ? null : (
          <AppText variant="callout" color="textSecondary">
            {intro}
          </AppText>
        )}
      </View>
      {children}
    </GlassScreen>
  );
}

function PlanCard({ plan }: { plan: PlanView; index: number }) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const done = plan.doneAt !== null;
  return (
    <Animated.View
      {...(reduceMotion
        ? {}
        : {
            entering: ENTER,
            layout: LAYOUT,
          })}
    >
      <Pressable
        onPress={() => {
          openPlan(plan.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${plan.title}. ${whenWords(plan.when)}${plan.place.length > 0 ? `, ${plan.place}` : ""}${done ? ". Done together" : ""}`}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.xs }}>
          {plan.art === null ? null : (
            <MediaArt art={plan.art} height={120} radius={radii.xl - 4} />
          )}
          <View style={{ padding: spacing.md, gap: spacing.xs }}>
            <View style={[styles.row, { gap: spacing.xs }]}>
              <AppText variant="headline" serif style={styles.flex} numberOfLines={2}>
                {plan.title}
              </AppText>
              {done ? <Icon name="check" size={18} color={colors.success} /> : null}
            </View>
            {plan.note.length === 0 ? null : (
              <AppText variant="footnote" color="textSecondary" numberOfLines={2}>
                {plan.note}
              </AppText>
            )}
            <View style={[styles.wrap, { gap: spacing.xs }]}>
              <View style={[styles.chip, { backgroundColor: colors.glassVeilSoft }]}>
                <AppText variant="caption" weight="600">
                  {themeEmoji(plan.theme)} {whenWords(plan.when)}
                </AppText>
              </View>
              {plan.place.length === 0 ? null : (
                <View style={[styles.chip, { backgroundColor: colors.glassVeilSoft }]}>
                  <AppText variant="caption" weight="600">
                    📍 {plan.place}
                  </AppText>
                </View>
              )}
            </View>
          </View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

/**
 * FUT-01 · When we meet again (prompt 13): your plans for together, by date or by theme, with
 * the finished ones folded away. Warm, never a countdown (dates read "Dec–Jan" or "Someday").
 */
export function PlansScreen() {
  const { colors, spacing } = useTheme();
  const plans = usePlans().data;
  const me = useHomeToday().data?.me;
  const [by, setBy] = useState<"date" | "theme">("date");
  const [showDone, setShowDone] = useState(false);
  const open = (plans ?? []).filter((p) => p.doneAt === null);
  const done = (plans ?? []).filter((p) => p.doneAt !== null);
  const groups =
    by === "date"
      ? [{ title: null as string | null, items: open }]
      : PLAN_THEMES.map((t) => ({
          title: `${t.emoji} ${t.theme}`,
          items: open.filter((p) => p.theme === t.theme),
        })).filter((g) => g.items.length > 0);
  return (
    <Frame title="When we meet again" intro="Things to do together, whenever that is.">
      <Segmented
        label="Group plans"
        options={[
          { label: "By date", value: "date" },
          { label: "By theme", value: "theme" },
        ]}
        value={by}
        onChange={setBy}
      />
      {plans === undefined ? (
        <Skeleton kind="grid" />
      ) : open.length === 0 ? (
        <View style={[styles.center, { gap: spacing.md, paddingVertical: spacing.lg }]}>
          <CharacterSlot
            character={me?.side ?? "garnet"}
            look={{ mood: "dreamy", occasion: "everyday" }}
            size={160}
            aspectRatio={FRAME_ASPECT}
          />
          <AppText variant="callout" color="textSecondary" style={styles.textCenter}>
            {done.length > 0
              ? "Everything on your list is done. What's next?"
              : "Start a list of things to do together."}
          </AppText>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.title ?? "all"} style={{ gap: spacing.sm }}>
            {g.title === null ? null : (
              <AppText
                variant="caption"
                weight="600"
                color="textSecondary"
                accessibilityRole="header"
              >
                {g.title.toUpperCase()}
              </AppText>
            )}
            {g.items.map((p, i) => (
              <PlanCard key={p.id} plan={p} index={i} />
            ))}
          </View>
        ))
      )}
      <Button
        label="Add a plan"
        onPress={() => {
          router.push("/our-world/plan-new");
        }}
      />
      {done.length === 0 ? null : (
        <View style={{ gap: spacing.sm }}>
          <Pressable
            onPress={() => {
              setShowDone((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Done together, ${String(done.length)}`}
            accessibilityState={{ expanded: showDone }}
            style={[styles.row, { gap: spacing.xs }]}
          >
            <Icon name="check" size={16} color={colors.success} />
            <AppText variant="headline" style={styles.flex}>
              Done together ({done.length})
            </AppText>
            <Icon
              name={showDone ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>
          {showDone ? done.map((p, i) => <PlanCard key={p.id} plan={p} index={i} />) : null}
        </View>
      )}
    </Frame>
  );
}

/** FUT-02 · Add or edit a plan: name, note, theme, picture, place and when. */
export function PlanFormScreen({ id }: { id: string | undefined }) {
  const { spacing, radii } = useTheme();
  const toast = useToast();
  const plans = usePlans().data;
  const save = useSavePlan();
  const existing = id === undefined ? undefined : plans?.find((p) => p.id === id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [theme, setTheme] = useState<PlanTheme>(existing?.theme ?? "Little things");
  const [art, setArt] = useState<DemoArt | null>(existing?.art ?? null);
  const [place, setPlace] = useState(existing?.place ?? "");
  const [when, setWhen] = useState<PlanWhen>(existing?.when ?? { type: "someday" });
  const [picking, setPicking] = useState<"photo" | "date" | "from" | "to" | null>(null);
  const today = Temporal.Now.plainDateISO();
  const problem = planProblem({ title, when });
  const submit = () => {
    if (problem !== null) {
      toast.show(problem, "error");
      return;
    }
    save.mutate(
      { ...(id === undefined ? {} : { id }), title, note, theme, art, place, when },
      {
        onSuccess: () => {
          toast.show(id === undefined ? "Added to your plans." : "Plan saved.", "success");
          goBack("/our-world/plans");
        },
        onError: (e: unknown) => {
          toast.show(serviceErrorMessage(e), "error");
        },
      },
    );
  };
  const dateOf = (s: string | undefined) =>
    s === undefined ? today.add({ days: 30 }) : Temporal.PlainDate.from(s);
  return (
    <Frame
      title={id === undefined ? "New plan" : "Edit plan"}
      back="/our-world/plans"
      tabBar={false}
    >
      <Glass radius={radii.xl} contentStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <TextField
          label="What would you like to do?"
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          placeholder="Recreate our first date"
        />
        <TextField label="A note" value={note} onChangeText={setNote} rows={3} maxLength={300} />
        <TextField
          label="Where (optional)"
          icon="pin"
          value={place}
          onChangeText={setPlace}
          maxLength={60}
          placeholder="A café, a city, a beach"
        />
      </Glass>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="footnote" weight="600" color="textSecondary">
          Theme
        </AppText>
        <View style={[styles.wrap, { gap: spacing.xs }]}>
          {PLAN_THEMES.map((t) => (
            <GlassChip
              key={t.theme}
              label={t.theme}
              leading={t.emoji}
              selected={theme === t.theme}
              onPress={() => {
                setTheme(t.theme);
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="footnote" weight="600" color="textSecondary">
          When
        </AppText>
        <Segmented
          label="When"
          options={[
            { label: "Someday", value: "someday" },
            { label: "A date", value: "date" },
            { label: "A range", value: "range" },
          ]}
          value={when.type}
          onChange={(t) => {
            setWhen(
              t === "someday"
                ? { type: "someday" }
                : t === "date"
                  ? { type: "date", date: dateOf(undefined).toString() }
                  : {
                      type: "range",
                      from: dateOf(undefined).toString(),
                      to: dateOf(undefined).add({ days: 30 }).toString(),
                    },
            );
          }}
        />
        {when.type === "date" ? (
          <Button
            label={`On ${whenWords(when)}`}
            variant="secondary"
            onPress={() => {
              setPicking("date");
            }}
          />
        ) : null}
        {when.type === "range" ? (
          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={styles.flex}>
              <Button
                label={`From ${Temporal.PlainDate.from(when.from).toLocaleString("en-GB", { day: "numeric", month: "short" })}`}
                variant="secondary"
                onPress={() => {
                  setPicking("from");
                }}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={`To ${Temporal.PlainDate.from(when.to).toLocaleString("en-GB", { day: "numeric", month: "short" })}`}
                variant="secondary"
                onPress={() => {
                  setPicking("to");
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
      {art === null ? (
        <Button
          label="Add a picture"
          variant="secondary"
          onPress={() => {
            setPicking("photo");
          }}
        />
      ) : (
        <Glass radius={radii.xl} contentStyle={{ padding: spacing.xs, gap: spacing.xs }}>
          <MediaArt art={art} height={140} radius={radii.xl - 4} />
          <Button
            label="Remove picture"
            variant="text"
            onPress={() => {
              setArt(null);
            }}
          />
        </Glass>
      )}
      <View style={{ gap: spacing.sm }}>
        <Button
          label={id === undefined ? "Add plan" : "Save"}
          loading={save.isPending}
          disabled={problem !== null}
          onPress={submit}
        />
        <Button
          label="Cancel"
          variant="text"
          onPress={() => {
            goBack("/our-world/plans");
          }}
        />
      </View>

      {picking === "photo" ? (
        <MediaPickerSheet
          visible
          onPick={(m) => {
            if (m.type !== "voice") setArt(m.art);
            setPicking(null);
          }}
          onVoice={() => {
            setPicking(null);
          }}
          onClose={() => {
            setPicking(null);
          }}
        />
      ) : null}
      {picking === "date" || picking === "from" || picking === "to" ? (
        <DatePickerSheet
          title={picking === "date" ? "Choose a date" : picking === "from" ? "From" : "To"}
          today={today}
          value={dateOf(
            when.type === "date"
              ? when.date
              : when.type === "range"
                ? picking === "to"
                  ? when.to
                  : when.from
                : undefined,
          )}
          onPick={(d) => {
            const s = d.toString();
            setWhen((w) =>
              picking === "date"
                ? { type: "date", date: s }
                : w.type === "range"
                  ? picking === "from"
                    ? { ...w, from: s }
                    : { ...w, to: s }
                  : w,
            );
            setPicking(null);
          }}
          onClose={() => {
            setPicking(null);
          }}
        />
      ) : null}
    </Frame>
  );
}

/** FUT-03 · A plan, and the moment you finally do it together. */
export function PlanDetailScreen({ id }: { id: string }) {
  const { colors, radii, spacing } = useTheme();
  const toast = useToast();
  const plans = usePlans().data;
  const complete = useCompletePlan();
  const remove = useDeletePlan();
  const [moment, setMoment] = useState(false);
  const [dialog, setDialog] = useState<"delete" | "memory" | null>(null);
  const plan = plans?.find((p) => p.id === id);
  if (plans === undefined)
    return (
      <Frame title="Plan" back="/our-world/plans">
        <Skeleton kind="grid" />
      </Frame>
    );
  if (plan === undefined)
    return (
      <Frame title="Plan" back="/our-world/plans">
        <AppText variant="callout" color="textSecondary">
          This item isn't available here.
        </AppText>
      </Frame>
    );
  const done = plan.doneAt !== null;
  return (
    <Frame title={plan.title} back="/our-world/plans">
      <Glass radius={radii.xl + 4} contentStyle={{ padding: spacing.xs }}>
        {plan.art === null ? null : <MediaArt art={plan.art} height={200} radius={radii.xl} />}
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {plan.note.length === 0 ? null : (
            <AppText variant="body" serif>
              {plan.note}
            </AppText>
          )}
          <View style={[styles.wrap, { gap: spacing.xs }]}>
            <View style={[styles.chip, { backgroundColor: colors.glassVeilSoft }]}>
              <AppText variant="caption" weight="600">
                {themeEmoji(plan.theme)} {plan.theme} · {whenWords(plan.when)}
              </AppText>
            </View>
            {plan.place.length === 0 ? null : (
              <View style={[styles.chip, { backgroundColor: colors.glassVeilSoft }]}>
                <AppText variant="caption" weight="600">
                  📍 {plan.place}
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="caption" color="textTertiary">
            Added by {plan.by}
            {done
              ? ` · done together ${Temporal.PlainDate.from(plan.doneAt ?? "").toLocaleString("en-GB", { day: "numeric", month: "long" })}`
              : ""}
          </AppText>
        </View>
      </Glass>
      <View style={{ gap: spacing.sm }}>
        {done ? (
          <Button
            label="Add a photo of the moment"
            variant="secondary"
            onPress={() => {
              setDialog("memory");
            }}
          />
        ) : (
          <Button
            label="Mark as done together"
            loading={complete.isPending}
            onPress={() => {
              complete.mutate(plan.id, {
                onSuccess: () => {
                  setMoment(true);
                },
                onError: (e: unknown) => {
                  toast.show(serviceErrorMessage(e), "error");
                },
              });
            }}
          />
        )}
        {done ? null : (
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => {
              router.push({ pathname: "/our-world/plan-new", params: { id: plan.id } });
            }}
          />
        )}
        <Button
          label="Delete plan"
          variant="text"
          onPress={() => {
            setDialog("delete");
          }}
        />
      </View>

      {moment ? (
        <TogetherMoment
          line="We finally did it. ❤️💙"
          sub={plan.title}
          onDone={() => {
            setMoment(false);
            setDialog("memory");
          }}
        />
      ) : null}
      <ActionSheet
        visible={dialog === "delete"}
        title="Delete this plan?"
        body="It's removed for both of you."
        icon="trash"
        confirmLabel="Delete"
        destructive
        onCancel={() => {
          setDialog(null);
        }}
        onConfirm={() => {
          remove.mutate(plan.id, {
            onSuccess: () => {
              setDialog(null);
              toast.show("Plan deleted.");
              goBack("/our-world/plans");
            },
          });
        }}
      />
      {dialog === "memory" ? (
        <SaveMemorySheet
          media={plan.art === null ? null : { type: "photo", art: plan.art }}
          title={plan.title}
          story={plan.note}
          date={plan.doneAt ?? Temporal.Now.plainDateISO().toString()}
          place={plan.place}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </Frame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  center: { alignItems: "center" },
  textCenter: { textAlign: "center" },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
