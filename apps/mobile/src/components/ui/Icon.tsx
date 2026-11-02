import Svg, { Circle, Path } from "react-native-svg";

/**
 * Thin rounded line icons (master style: 1.75-pt strokes). Drawn in-house so the app needs no
 * icon dependency. Icons are decorative; the control around them carries the label.
 */
export type IconName =
  | "chevron-left"
  | "eye"
  | "eye-off"
  | "alert"
  | "check"
  | "mail"
  | "wifi-off"
  | "x"
  | "lock"
  | "sparkle"
  | "user"
  | "clock"
  | "sign-out"
  | "devices"
  | "arrow-right"
  | "chevron-right"
  | "key"
  | "copy"
  | "share"
  | "paste"
  | "shield"
  | "info"
  | "send"
  | "home"
  | "calendar"
  | "heart"
  | "gem"
  | "globe"
  | "plus"
  | "settings"
  | "search"
  | "more"
  | "sliders"
  | "play"
  | "pause"
  | "stop"
  | "mic"
  | "image"
  | "video"
  | "pin"
  | "moon"
  | "trash"
  | "edit"
  | "chat"
  | "refresh"
  | "smile"
  | "bookmark"
  | "camera"
  | "volume"
  | "mute"
  | "leaf"
  | "cup"
  | "ball"
  | "car"
  | "bulb"
  | "hash"
  | "flag"
  | "backspace"
  | "reply"
  | "bell"
  | "chevron-down"
  | "chevron-up"
  | "plane"
  | "palette"
  | "download"
  | "help";

const paths: Record<IconName, readonly string[]> = {
  "chevron-left": ["M15 5 8 12l7 7"],
  eye: ["M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"],
  "eye-off": [
    "M4 4l16 16",
    "M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4",
    "M6.4 7.6C3.9 9.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.4 9.4 0 0 0 4.1-.9",
    "M9.9 9.9a3 3 0 0 0 4.2 4.2",
  ],
  alert: ["M12 7.5v5.5", "M12 16.5h.01"],
  check: ["M5 12.5 10 17.5 19 7"],
  mail: ["M3.5 6.5h17v11h-17z", "m3.5 7 8.5 6.5L20.5 7"],
  "wifi-off": [
    "M3 3l18 18",
    "M8.5 16.5a5 5 0 0 1 7 0",
    "M5 12.8a10 10 0 0 1 4.7-2.6",
    "M14.3 10.2A10 10 0 0 1 19 12.8",
    "M2 9a15 15 0 0 1 4.4-2.8",
    "M10.6 5.6A15 15 0 0 1 22 9",
    "M12 20h.01",
  ],
  x: ["M6 6l12 12", "M18 6 6 18"],
  lock: ["M6.5 11h11v9h-11z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  sparkle: ["M12 3.5 13.8 10.2 20.5 12 13.8 13.8 12 20.5 10.2 13.8 3.5 12 10.2 10.2Z"],
  user: ["M5 20a7 7 0 0 1 14 0"],
  clock: ["M12 7.5V12l3 2"],
  "sign-out": ["M14 4.5H6.5v15H14", "M10.5 12h10", "M17.5 8.5 21 12l-3.5 3.5"],
  devices: ["M3.5 6.5h12v9h-12z", "M7 18.5h5", "M17.5 9.5h3v9h-3z"],
  "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
  "chevron-right": ["M9 5l7 7-7 7"],
  key: ["M10.5 12.5 19 4", "M16 7l2.5 2.5", "M14 9l2 2"],
  copy: ["M8.5 8.5h10v11h-10z", "M5.5 15.5v-11h10"],
  share: ["M12 15V4", "M8 8l4-4 4 4", "M5.5 12v7.5h13V12"],
  paste: ["M8 5.5H6v14h12v-14h-2", "M9 4h6v3H9z"],
  shield: ["M12 3.5l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5z", "M9 12l2 2 4-4"],
  info: ["M12 11v5.5", "M12 7.5h.01"],
  send: ["M20 4 9.5 14.5", "M20 4l-6.5 16-4-5.5L4 10.5z"],
  home: ["M4 11 12 4.5l8 6.5", "M6 9.5V19.5h12V9.5", "M10 19.5v-5h4v5"],
  calendar: ["M4.5 6.5h15v13h-15z", "M4.5 10.5h15", "M8.5 4v4", "M15.5 4v4"],
  heart: [
    "M12 19.5s-7.5-4.6-7.5-10A4.1 4.1 0 0 1 12 7.2a4.1 4.1 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10Z",
  ],
  gem: ["M7 4.5h10l3.5 4.5L12 20 3.5 9z", "M3.5 9h17", "M9.5 4.5 12 9l2.5-4.5", "M12 9v11"],
  globe: [
    "M3.5 12h17",
    "M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5Z",
  ],
  plus: ["M12 5v14", "M5 12h14"],
  settings: [
    "M12 3.5v2.5",
    "M12 18v2.5",
    "M3.5 12H6",
    "M18 12h2.5",
    "M6 6l1.8 1.8",
    "M16.2 16.2 18 18",
    "M6 18l1.8-1.8",
    "M16.2 7.8 18 6",
  ],
  search: ["M16 16l4.5 4.5"],
  more: [],
  sliders: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9"],
  play: ["M8 5.5v13l10.5-6.5z"],
  pause: ["M8.5 5.5v13", "M15.5 5.5v13"],
  stop: ["M7 7h10v10H7z"],
  mic: [
    "M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3z",
    "M5.5 11a6.5 6.5 0 0 0 13 0",
    "M12 17.5v3",
  ],
  image: ["M4 5.5h16v13H4z", "m4 16 4.5-4.5 3.5 3.5 2.5-2.5L20 17"],
  video: ["M3.5 7h11v10h-11z", "M14.5 10.5 20.5 7v10l-6-3.5"],
  pin: ["M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"],
  moon: ["M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"],
  trash: ["M4.5 6.5h15", "M9.5 6.5V4.5h5v2", "M6.5 6.5l1 13h9l1-13", "M10 10.5v6", "M14 10.5v6"],
  edit: ["M4.5 19.5l1-4 10-10 3 3-10 10z", "M13.5 7.5l3 3"],
  chat: ["M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5z"],
  refresh: ["M19.5 12a7.5 7.5 0 1 1-2.2-5.3", "M19.5 4.5v4h-4"],
  smile: ["M8.5 14a4.5 4.5 0 0 0 7 0", "M9 9.5h.01", "M15 9.5h.01"],
  bookmark: ["M7 4.5h10v15l-5-3.5-5 3.5z"],
  camera: ["M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z"],
  volume: ["M4.5 9.5h3l4.5-4v13l-4.5-4h-3z", "M15.5 9a4 4 0 0 1 0 6", "M18 6.5a7.5 7.5 0 0 1 0 11"],
  mute: ["M4.5 9.5h3l4.5-4v13l-4.5-4h-3z", "M16 9.5l5 5", "M21 9.5l-5 5"],
  leaf: ["M5 19c0-8 6-13.5 14.5-13.5 0 8.5-5.5 13.5-13.5 13.5z", "M5 19l8-8"],
  cup: [
    "M5 9.5h11v5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5z",
    "M16 11h1.5a2 2 0 0 1 0 4H16",
    "M9 4.5v2.5",
    "M12 4.5v2.5",
  ],
  ball: ["M3.5 12h17", "M12 3.5v17", "M6 6c3 3 3 9 0 12", "M18 6c-3 3-3 9 0 12"],
  car: ["M4.5 16v-3.5l2-5h11l2 5V16z", "M4.5 16v2.5H7V16", "M17 16v2.5h2.5V16", "M4.5 12.5h15"],
  bulb: [
    "M9.5 17.5h5",
    "M10.5 20.5h3",
    "M9.5 17.5c0-2.5-3.5-3.5-3.5-7.5a6 6 0 0 1 12 0c0 4-3.5 5-3.5 7.5",
  ],
  hash: ["M9.5 4.5 8 19.5", "M16 4.5 14.5 19.5", "M5 9h14.5", "M4.5 15H19"],
  flag: ["M6 20.5V4.5", "M6 5h11.5L15 9l2.5 4H6"],
  backspace: ["M9 5.5h11.5v13H9L3.5 12z", "M12.5 9.5l5 5", "M17.5 9.5l-5 5"],
  reply: ["M10 7.5 5 12l5 4.5", "M5 12h9a5 5 0 0 1 5 5v1.5"],
  bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", "M10 20.5h4"],
  "chevron-down": ["M5 9l7 7 7-7"],
  "chevron-up": ["M5 15l7-7 7 7"],
  plane: [
    "M10.5 13.5 4 16v-2l6.5-4V5.5a1.5 1.5 0 0 1 3 0V10l6.5 4v2l-6.5-2.5v4l2 1.5v1.5l-3.5-1-3.5 1V19l2-1.5z",
  ],
  palette: [
    "M12 3.5a8.5 8.5 0 0 0 0 17c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a3.5 3.5 0 0 0 3.5-3.5c0-4.5-3.8-7.5-8.5-7.5z",
  ],
  download: ["M12 4.5v10", "M8 10.5l4 4 4-4", "M5.5 19.5h13"],
  help: ["M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7", "M12 16.5h.01"],
};

/** Icons that also draw circles (alert, user head, clock face, eye pupil, the three dots). */
const circles: Partial<Record<IconName, readonly { cx: number; cy: number; r: number }[]>> = {
  alert: [{ cx: 12, cy: 12, r: 9 }],
  eye: [{ cx: 12, cy: 12, r: 3 }],
  user: [{ cx: 12, cy: 8, r: 3.75 }],
  clock: [{ cx: 12, cy: 12, r: 8.5 }],
  key: [{ cx: 7.5, cy: 15.5, r: 3.5 }],
  info: [{ cx: 12, cy: 12, r: 9 }],
  globe: [{ cx: 12, cy: 12, r: 8.5 }],
  settings: [{ cx: 12, cy: 12, r: 3.5 }],
  search: [{ cx: 11, cy: 11, r: 6.5 }],
  more: [
    { cx: 5.5, cy: 12, r: 1.1 },
    { cx: 12, cy: 12, r: 1.1 },
    { cx: 18.5, cy: 12, r: 1.1 },
  ],
  sliders: [
    { cx: 15, cy: 7, r: 2 },
    { cx: 9, cy: 17, r: 2 },
  ],
  image: [{ cx: 15.5, cy: 9.5, r: 1.5 }],
  pin: [{ cx: 12, cy: 10, r: 2.5 }],
  smile: [{ cx: 12, cy: 12, r: 8.5 }],
  camera: [{ cx: 12, cy: 13, r: 3.25 }],
  ball: [{ cx: 12, cy: 12, r: 8.5 }],
  help: [{ cx: 12, cy: 12, r: 9 }],
  palette: [
    { cx: 8, cy: 11, r: 1 },
    { cx: 11, cy: 7.5, r: 1 },
    { cx: 15.5, cy: 8.5, r: 1 },
  ],
};

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  const rings = circles[name] ?? [];
  return (
    // Decorative: hidden from assistive tech. (`accessible` would leak into the HTML on web.)
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden pointerEvents="none">
      {rings.map((c) => (
        <Circle
          key={`${c.cx}-${c.cy}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          stroke={color}
          strokeWidth={1.75}
          fill="none"
        />
      ))}
      {paths[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
