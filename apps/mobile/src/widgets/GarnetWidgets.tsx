"use no memo";
// Widget trees are plain functions the widget library walks once; no hooks, no fragments.
import type { JSX } from "react";
import type { Temporal } from "temporal-polyfill";
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
  type ColorProp,
  type WidgetRepresentation,
} from "react-native-android-widget";
import type { FigureId } from "@/features/figures/types";
import { widgetArt } from "./art";
import { GREETING, widgetLook } from "./look";
import { dayPart, EMPTY_SNAPSHOT, type DayPart, type WidgetSnapshot } from "./snapshot";

/**
 * The real Android home-screen widgets (widgets plan W1 to W6, P-72, P-73), drawn from the
 * snapshot only. Each one is a single large character and very few words: no streaks, counts,
 * names, titles or content, and never a sad face (§5). Tapping opens the app; "Thinking of you"
 * opens a confirmation in the app and never sends from the home screen (§6).
 */
export const WIDGET_NAMES = [
  "GarnetToday",
  "TwoClocks",
  "ThinkingOfYou",
  "SomethingWaiting",
  "ComingUp",
  "FarApart",
] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

interface Palette {
  from: ColorProp;
  to: ColorProp;
  ink: ColorProp;
  soft: ColorProp;
  pill: ColorProp;
}
const LIGHT: Palette = {
  from: "#FFFFFF",
  to: "#F1ECFB",
  ink: "#15131C",
  soft: "#575266",
  pill: "rgba(123, 85, 240, 0.12)",
};
const DARK: Palette = {
  from: "#221C33",
  to: "#151021",
  ink: "#FFFFFF",
  soft: "rgba(255, 255, 255, 0.72)",
  pill: "rgba(255, 255, 255, 0.12)",
};
/** White text on these passes WCAG AA (ruby500, sapphire500). */
const GEM: Record<"ruby" | "sapphire", ColorProp> = { ruby: "#D7264A", sapphire: "#2F66F5" };

const OPEN_APP = { clickAction: "OPEN_APP" } as const;
const openUri = (path: string) => ({
  clickAction: "OPEN_URI",
  clickActionData: { uri: `garnet://${path}` },
});

export interface WidgetSize {
  width: number;
  height: number;
}

/** "Africa/Addis_Ababa" → "Addis Ababa" (the zone is already shown in the app). */
function cityOf(zone: string): string {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

function Shell({
  p,
  label,
  click,
  row = false,
  children,
}: {
  p: Palette;
  label: string;
  click: { clickAction: string; clickActionData?: Record<string, unknown> };
  row?: boolean;
  children: unknown;
}) {
  return (
    <FlexWidget
      {...click}
      accessibilityLabel={label}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: row ? "row" : "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 24,
        backgroundGradient: { from: p.from, to: p.to, orientation: "TOP_BOTTOM" },
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Character({
  id,
  part,
  snap,
  size,
  look,
}: {
  id: FigureId;
  part: DayPart;
  snap: WidgetSnapshot;
  size: number;
  look?: ReturnType<typeof widgetLook>;
}) {
  const art = widgetArt(
    id,
    look ?? widgetLook(part, snap.special, snap.somethingNew, snap.waiting),
  );
  if (art === undefined) {
    // No owner image on this build: the gem colour stands in (never a drawn character).
    const color = id === "sapphire" ? GEM.sapphire : GEM.ruby;
    return (
      <FlexWidget
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: size,
          backgroundColor: color,
        }}
      />
    );
  }
  return (
    <ImageWidget
      image={art}
      imageWidth={Math.round(size * 0.66)}
      imageHeight={size}
      resizeMode="contain"
    />
  );
}

function Text({
  text,
  p,
  size = 13,
  soft = false,
  bold = false,
  color,
}: {
  text: string;
  p: Palette;
  size?: number;
  soft?: boolean;
  bold?: boolean;
  color?: ColorProp;
}) {
  return (
    <TextWidget
      text={text}
      maxLines={2}
      truncate="END"
      style={{
        fontSize: size,
        color: color ?? (soft ? p.soft : p.ink),
        fontWeight: bold ? "600" : "400",
        textAlign: "center",
      }}
    />
  );
}

function notReady(p: Palette) {
  return (
    <Shell p={p} label="Garnet. Open the app to begin" click={OPEN_APP}>
      <Character
        id="garnet"
        part="day"
        snap={EMPTY_SNAPSHOT}
        size={90}
        look={{ mood: "hello", occasion: "everyday" }}
      />
      <Text p={p} text="Open Garnet to begin 💜" bold />
    </Shell>
  );
}

function draw(
  name: WidgetName,
  snap: WidgetSnapshot,
  size: WidgetSize,
  now: Temporal.Instant,
  p: Palette,
): JSX.Element {
  if (!snap.ready) return notReady(p);
  const part = dayPart(now, snap.myZone);
  const theirPart = snap.partnerZone === null ? part : dayPart(now, snap.partnerZone);
  const wide = size.width >= 220;
  const tall = Math.max(70, Math.min(size.height - 50, 150));
  const mine: FigureId = snap.mySide ?? "garnet";
  const theirs: FigureId = snap.partnerSide ?? "garnet";
  switch (name) {
    case "GarnetToday": {
      const line = snap.special ? "A day that matters to you both 🎉" : "Garnet is with you both";
      return wide ? (
        <Shell p={p} label={`Garnet. ${GREETING[part]}`} click={OPEN_APP} row>
          <Character id="garnet" part={part} snap={snap} size={Math.min(size.height - 24, 160)} />
          <FlexWidget
            style={{ flex: 1, flexDirection: "column", alignItems: "center", flexGap: 4 }}
          >
            <Text p={p} text={GREETING[part]} size={20} bold />
            <Text p={p} text={line} soft />
          </FlexWidget>
        </Shell>
      ) : (
        <Shell p={p} label={`Garnet. ${GREETING[part]}`} click={OPEN_APP}>
          <Character id="garnet" part={part} snap={snap} size={tall} />
          <Text p={p} text={GREETING[part]} bold />
        </Shell>
      );
    }
    case "TwoClocks": {
      const both =
        part !== "night" && theirPart !== "night"
          ? "Both awake 💜"
          : theirPart === "night"
            ? "Night where they are 🌙"
            : "Night for you 🌙";
      const side = (id: FigureId, zone: string | null, who: DayPart) => (
        <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
          <Character
            id={id}
            part={who}
            snap={snap}
            size={Math.min(size.height - 54, 110)}
            look={widgetLook(who, snap.special, false, false)}
          />
          <Text p={p} text={label(who)} bold />
          <Text p={p} text={zone === null ? "" : cityOf(zone)} size={11} soft />
        </FlexWidget>
      );
      return (
        <Shell p={p} label={`Two clocks. ${both}`} click={openUri("us")} row>
          {side(mine, snap.myZone, part)}
          <FlexWidget
            style={{
              backgroundColor: p.pill,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text p={p} text={both} size={12} bold />
          </FlexWidget>
          {side(theirs, snap.partnerZone, theirPart)}
        </Shell>
      );
    }
    case "ThinkingOfYou":
      return (
        <Shell
          p={p}
          label="Thinking of you. Opens Garnet to ask first"
          click={openUri("send-thought")}
        >
          <Character
            id={mine}
            part={part}
            snap={snap}
            size={tall - 10}
            look={{ mood: "loving", occasion: "everyday" }}
          />
          <FlexWidget
            {...openUri("send-thought")}
            style={{
              backgroundColor: mine === "sapphire" ? GEM.sapphire : GEM.ruby,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text p={p} text="💭 Thinking of you" size={12} bold color="#FFFFFF" />
          </FlexWidget>
        </Shell>
      );
    case "SomethingWaiting":
      return (
        <Shell
          p={p}
          label={snap.waiting ? "Something is waiting for you" : "All caught up"}
          click={openUri("moments")}
        >
          <Character
            id="garnet"
            part={part}
            snap={snap}
            size={tall}
            look={
              snap.waiting
                ? { mood: "surprised", occasion: "surprise" }
                : widgetLook(part, false, false, false)
            }
          />
          <Text p={p} text={snap.waiting ? "💌 Something's waiting" : "All caught up"} bold />
        </Shell>
      );
    case "ComingUp": {
      const d = snap.nextEventDays;
      const when =
        d === null
          ? "Nothing planned yet"
          : d === 0
            ? "Today ✨"
            : d === 1
              ? "Tomorrow"
              : `In ${String(d)} days`;
      return (
        <Shell p={p} label={`Coming up. ${when}`} click={openUri("moments")}>
          <Character
            id="garnet"
            part={part}
            snap={snap}
            size={tall - 16}
            look={
              d !== null && d <= 1
                ? { mood: "celebrating", occasion: "celebration" }
                : { mood: "happy", occasion: "everyday" }
            }
          />
          <Text p={p} text={when} size={16} bold />
          <Text
            p={p}
            text={d === null ? "Add a day in Moments" : "Something special"}
            size={11}
            soft
          />
        </Shell>
      );
    }
    case "FarApart": {
      const km = snap.km === null ? null : `≈ ${snap.km.toLocaleString("en-GB")} km`;
      return (
        <Shell
          p={p}
          label={km === null ? "Distance is off" : `About ${km} apart`}
          click={openUri("us")}
          row
        >
          <Character id={mine} part={part} snap={snap} size={Math.min(size.height - 24, 110)} />
          <FlexWidget
            style={{ flex: 1, flexDirection: "column", alignItems: "center", flexGap: 2 }}
          >
            <Text p={p} text="✈️" size={18} />
            <Text p={p} text={km ?? "Distance is off"} size={18} bold />
            <Text
              p={p}
              text={km === null ? "Turn it on in Settings" : "Close at heart"}
              size={11}
              soft
            />
          </FlexWidget>
          <Character
            id={theirs}
            part={theirPart}
            snap={snap}
            size={Math.min(size.height - 24, 110)}
          />
        </Shell>
      );
    }
  }
}

function label(part: DayPart): string {
  switch (part) {
    case "morning":
      return "Morning";
    case "day":
      return "Daytime";
    case "evening":
      return "Evening";
    case "night":
      return "Night";
  }
}

/**
 * A widget in light and dark (the system picks). Night always uses the dark look, like StandBy.
 * The part of the day is this phone's own clock in this person's zone, worked out at each
 * refresh (every 30 minutes and whenever the app changes something).
 */
export function renderWidget(
  name: WidgetName,
  snap: WidgetSnapshot,
  size: WidgetSize,
  now: Temporal.Instant,
): WidgetRepresentation {
  const night = dayPart(now, snap.myZone) === "night";
  return {
    light: draw(name, snap, size, now, night ? DARK : LIGHT),
    dark: draw(name, snap, size, now, DARK),
  };
}

export function isWidgetName(name: string): name is WidgetName {
  return (WIDGET_NAMES as readonly string[]).includes(name);
}
