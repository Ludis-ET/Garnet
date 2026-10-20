/**
 * Garnet design tokens — PROVISIONAL (Master Mobile Design Specification A13: "Exact
 * color/type/spacing tokens: to finalize in prototype"). Every screen reads tokens from here;
 * never hard-code a colour, size or duration in a component.
 *
 * Direction (spec §4): Ruby side = warm garnet/crimson; Sapphire side = calm blue/navy;
 * together = violet/garnet. Intimate, elegant, dreamy, minimal, cinematic. Dark-first.
 * Text/background pairs are contrast-checked in tokens.test.ts (WCAG 2.2 AA).
 */

/** Raw palette. Components use semantic tokens (ColorTokens), not these, except in art. */
export const palette = {
  // Ruby — warm, expressive, alive
  ruby50: "#FFF0F3",
  ruby200: "#F7A8B8",
  ruby400: "#E8536F",
  ruby500: "#D7264A",
  ruby700: "#9E1636",
  ruby900: "#4A0A1C",
  // Sapphire — calm, dreamy, spacious
  sapphire50: "#EEF4FF",
  sapphire200: "#A9C4FF",
  sapphire400: "#5B8CFF",
  sapphire500: "#2F66F5",
  sapphire700: "#1A3FA8",
  sapphire900: "#0B1B4A",
  cyanGlow: "#7FE3FF",
  // Garnet / violet — together
  violet200: "#C9B6FF",
  violet400: "#9A7BFF",
  violet500: "#7B55F0",
  garnet600: "#8E1F4F",
  garnet800: "#3D0E2A",
  // Neutrals (slightly violet-tinted so the UI never feels clinical)
  ink950: "#0D0B12",
  ink900: "#14111B",
  ink850: "#1B1724",
  ink800: "#241F30",
  ink600: "#4A4358",
  ink400: "#8B8399",
  ink200: "#CFC9D9",
  ink100: "#E9E5EF",
  ink50: "#F7F5FA",
  white: "#FFFFFF",
  // Feedback (used sparingly; never the only signal — always paired with text/icon)
  success: "#3FBF8F",
  warning: "#F2B14A",
  danger: "#F0566E",
} as const;

export type Side = "ruby" | "sapphire" | "garnet";
export type ColorScheme = "light" | "dark";

export interface ColorTokens {
  /** App background. */
  background: string;
  /** Cards, sheets. */
  surface: string;
  /** Raised elements on surfaces (pressed rows, inputs). */
  surfaceRaised: string;
  /** Hairline borders and dividers. */
  border: string;
  textPrimary: string;
  textSecondary: string;
  /** Placeholder / disabled text. Not for essential information. */
  textTertiary: string;
  /** Text and icons placed on an accent fill. */
  onAccent: string;
  ruby: string;
  sapphire: string;
  garnet: string;
  /** Accent for the active side (the viewer's own side, or garnet for shared pages). */
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  /** Scrim behind sheets and dialogs. */
  scrim: string;
}

const dark: Omit<ColorTokens, "accent" | "accentSoft"> = {
  background: palette.ink950,
  surface: palette.ink900,
  surfaceRaised: palette.ink850,
  border: palette.ink800,
  textPrimary: palette.ink50,
  textSecondary: palette.ink200,
  textTertiary: palette.ink400,
  onAccent: palette.white,
  ruby: palette.ruby400,
  sapphire: palette.sapphire400,
  garnet: palette.violet400,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  scrim: "rgba(5, 4, 9, 0.72)",
};

const light: Omit<ColorTokens, "accent" | "accentSoft"> = {
  background: palette.ink50,
  surface: palette.white,
  surfaceRaised: palette.ink100,
  border: palette.ink200,
  textPrimary: palette.ink950,
  textSecondary: palette.ink600,
  textTertiary: palette.ink400,
  onAccent: palette.white,
  ruby: palette.ruby700,
  sapphire: palette.sapphire700,
  garnet: palette.violet500,
  success: "#1E7A57",
  warning: "#8A5A00",
  danger: "#B4233C",
  scrim: "rgba(13, 11, 18, 0.48)",
};

const accentFor: Record<ColorScheme, Record<Side, { accent: string; accentSoft: string }>> = {
  dark: {
    ruby: { accent: palette.ruby400, accentSoft: "rgba(232, 83, 111, 0.16)" },
    sapphire: { accent: palette.sapphire400, accentSoft: "rgba(91, 140, 255, 0.16)" },
    garnet: { accent: palette.violet400, accentSoft: "rgba(154, 123, 255, 0.16)" },
  },
  light: {
    ruby: { accent: palette.ruby700, accentSoft: "rgba(158, 22, 54, 0.10)" },
    sapphire: { accent: palette.sapphire700, accentSoft: "rgba(26, 63, 168, 0.10)" },
    garnet: { accent: palette.violet500, accentSoft: "rgba(123, 85, 240, 0.10)" },
  },
};

export function colorsFor(scheme: ColorScheme, side: Side): ColorTokens {
  return { ...(scheme === "dark" ? dark : light), ...accentFor[scheme][side] };
}

/** Signature gradients (spec §4). Use for heroes and ceremonies only, never for body text backgrounds. */
export const gradients = {
  ruby: [palette.ruby900, palette.ruby500, palette.ruby200],
  sapphire: [palette.sapphire900, palette.sapphire500, palette.cyanGlow],
  together: [palette.ruby500, palette.violet500, palette.sapphire500],
  nightSky: [palette.ink950, palette.garnet800, palette.sapphire900],
} as const;

/** 4-pt spacing scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  hero: 64,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Minimum touch target (WCAG 2.2 target size; platform guidance is 44 pt / 48 dp). */
export const touchTarget = 48;

/**
 * Type scale. Families are PROVISIONAL: a display serif for intimate, editorial moments and a
 * humanist sans for UI. Until fonts are chosen and loaded, the system fonts are used.
 */
export const typography = {
  families: {
    display: undefined as string | undefined,
    text: undefined as string | undefined,
  },
  display: { fontSize: 34, lineHeight: 40, fontWeight: "600" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "600" },
  headline: { fontSize: 19, lineHeight: 25, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} as const;

export type TypeVariant = Exclude<keyof typeof typography, "families">;

/**
 * Motion (spec A8): purposeful, short, never blocking. Every animation must have a
 * reduced-motion path (see useReducedMotion). Ceremony durations are for milestones only.
 */
export const motion = {
  duration: { instant: 100, quick: 180, standard: 260, gentle: 420, ceremony: 900 },
  spring: {
    ruby: { damping: 14, stiffness: 180 }, // a little livelier
    sapphire: { damping: 22, stiffness: 120 }, // calmer, floating
    garnet: { damping: 18, stiffness: 150 },
  },
} as const;

/** Elevation for dark-first UI: soft glows instead of hard shadows. */
export const elevation = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  sheet: {
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
} as const;
