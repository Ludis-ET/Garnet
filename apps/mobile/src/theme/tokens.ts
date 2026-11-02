/**
 * Garnet design tokens — PROVISIONAL (Master Mobile Design Specification A13: "Exact
 * color/type/spacing tokens: to finalize in prototype"). Every screen reads tokens from here;
 * never hard-code a colour, size or duration in a component.
 *
 * Direction (spec §4): Ruby side = warm garnet/crimson; Sapphire side = calm blue/navy;
 * together = violet/garnet. Visual language "Daylight Glass" (P-48): light-first porcelain canvas
 * with a soft aurora, frosted glass panes and springy motion; "Night Glass" is the dark variant.
 * Text/background pairs are contrast-checked in tokens.test.ts (WCAG 2.2 AA), including text on
 * the strongest aurora colour and on glass over it.
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
  violet600: "#6741E0",
  violet800: "#4B2BC2",
  garnet600: "#8E1F4F",
  garnet800: "#3D0E2A",
  // Neutrals (slightly violet-tinted so the UI never feels clinical)
  ink950: "#0D0B12",
  ink900: "#14111B",
  ink850: "#1B1724",
  ink800: "#241F30",
  ink600: "#4A4358",
  ink500: "#675F75",
  ink400: "#8B8399",
  ink200: "#CFC9D9",
  ink100: "#E9E5EF",
  ink50: "#F7F5FA",
  /** Daylight Glass canvas (P-48). */
  porcelain: "#FAF9FC",
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
  /** Filled controls (primary buttons): white text on it meets WCAG AA in both schemes. */
  accentStrong: string;
  success: string;
  warning: string;
  danger: string;
  /** Scrim behind sheets and dialogs. */
  scrim: string;
  /** Lower stop of the primary button's gradient (accentStrong is the upper). */
  accentStrongEnd: string;
  /** The tactile "lip" under the primary button. */
  accentLip: string;
  disabledFill: string;
  disabledLip: string;
  disabledText: string;
  /** Glass (P-48): veil behind text (≥ 72 % white in light), a softer decorative veil, the
   * top highlight line, the outer hairline and the shadow colour. */
  glassVeil: string;
  glassVeilSoft: string;
  glassHighlight: string;
  glassHairline: string;
  /** "Liquid" rim (P-51 pass): bright top-left to faint bottom-right, and the top sheen. */
  glassRimStart: string;
  glassRimEnd: string;
  glassSheen: string;
  shadow: string;
  /** Tints laid over a glass veil for Ruby, Sapphire and Garnet panes. */
  tintRuby: string;
  tintSapphire: string;
  tintGarnet: string;
  /**
   * Aurora orbs on the canvas (centre colour; each fades to transparent). Per side (P-55):
   * Sapphire people get a cool, blueish canvas; Ruby people a warm, rosy one; shared pages keep
   * the rose / sky / lilac mix of Garnet.
   */
  auroraRose: string;
  auroraSky: string;
  auroraLilac: string;
}

/** Per-side accents: the viewer's own side on personal pages, Garnet violet on shared ones. */
type AccentKey =
  | "accent"
  | "accentSoft"
  | "accentStrong"
  | "accentStrongEnd"
  | "accentLip"
  | "auroraRose"
  | "auroraSky"
  | "auroraLilac";

const dark: Omit<ColorTokens, AccentKey> = {
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
  scrim: "rgba(5, 4, 9, 0.6)",
  disabledFill: "#2A2536",
  disabledLip: "#1E1A28",
  disabledText: palette.ink400,
  glassVeil: "rgba(22, 19, 32, 0.52)",
  glassVeilSoft: "rgba(22, 19, 32, 0.38)",
  glassHighlight: "rgba(255, 255, 255, 0.10)",
  glassHairline: "rgba(255, 255, 255, 0.08)",
  glassRimStart: "rgba(255, 255, 255, 0.30)",
  glassRimEnd: "rgba(255, 255, 255, 0.05)",
  glassSheen: "rgba(255, 255, 255, 0.10)",
  shadow: "#000000",
  tintRuby: "rgba(215, 38, 74, 0.18)",
  tintSapphire: "rgba(47, 102, 245, 0.18)",
  tintGarnet: "rgba(123, 85, 240, 0.18)",
};

// Daylight Glass (P-48). Text colours hold ≥ 4.5:1 even on the strongest aurora colour.
const light: Omit<ColorTokens, AccentKey> = {
  background: palette.porcelain,
  surface: palette.white,
  surfaceRaised: "#F1EEF6",
  border: "#E4DFEC",
  textPrimary: "#15131C",
  textSecondary: "#575266",
  textTertiary: "#615B6F",
  onAccent: palette.white,
  ruby: palette.ruby700,
  sapphire: palette.sapphire700,
  garnet: palette.violet600,
  success: "#18684A",
  warning: "#7A4F00",
  danger: "#B4233C",
  scrim: "rgba(20, 16, 36, 0.28)",
  disabledFill: "#ECE9F1",
  disabledLip: "#D9D4E2",
  disabledText: "#8D879B",
  // Text colours pass AA on the raw aurora, so the veil can stay light and see-through.
  glassVeil: "rgba(255, 255, 255, 0.52)",
  glassVeilSoft: "rgba(255, 255, 255, 0.36)",
  glassHighlight: "rgba(255, 255, 255, 0.95)",
  glassHairline: "rgba(24, 18, 48, 0.08)",
  glassRimStart: "rgba(255, 255, 255, 0.98)",
  glassRimEnd: "rgba(110, 90, 180, 0.22)",
  glassSheen: "rgba(255, 255, 255, 0.62)",
  shadow: "#3A2A7A",
  tintRuby: "rgba(255, 160, 185, 0.28)",
  tintSapphire: "rgba(150, 185, 255, 0.28)",
  tintGarnet: "rgba(190, 170, 255, 0.28)",
};

type Accents = Pick<ColorTokens, AccentKey>;

const accentFor: Record<ColorScheme, Record<Side, Accents>> = {
  dark: {
    ruby: {
      accent: palette.ruby400,
      accentSoft: "rgba(232, 83, 111, 0.16)",
      accentStrong: palette.ruby500,
      accentStrongEnd: "#B81E3E",
      accentLip: "#7A1029",
      auroraRose: "rgba(122, 16, 41, 0.4)",
      auroraSky: "rgba(90, 23, 48, 0.4)",
      auroraLilac: "rgba(74, 10, 28, 0.45)",
    },
    sapphire: {
      accent: palette.sapphire400,
      accentSoft: "rgba(91, 140, 255, 0.16)",
      accentStrong: palette.sapphire500,
      accentStrongEnd: "#2553D6",
      accentLip: "#173A9E",
      auroraRose: "rgba(15, 42, 107, 0.55)",
      auroraSky: "rgba(23, 58, 158, 0.3)",
      auroraLilac: "rgba(44, 31, 110, 0.42)",
    },
    garnet: {
      accent: palette.violet400,
      accentSoft: "rgba(154, 123, 255, 0.16)",
      accentStrong: palette.violet500,
      accentStrongEnd: palette.violet600,
      accentLip: "#3A2098",
      auroraRose: "rgba(90, 23, 48, 0.55)",
      auroraSky: "rgba(15, 42, 107, 0.55)",
      auroraLilac: "rgba(44, 31, 110, 0.55)",
    },
  },
  light: {
    ruby: {
      accent: palette.ruby700,
      accentSoft: "rgba(158, 22, 54, 0.10)",
      accentStrong: "#C41E43",
      accentStrongEnd: palette.ruby700,
      accentLip: "#7A0F2A",
      auroraRose: "#FFD3DE",
      auroraSky: "#FFE0D6",
      auroraLilac: "#F8DDEB",
    },
    sapphire: {
      accent: palette.sapphire700,
      accentSoft: "rgba(26, 63, 168, 0.10)",
      accentStrong: "#2A5BE0",
      accentStrongEnd: palette.sapphire700,
      accentLip: "#14317F",
      auroraRose: "#CFE3FF",
      auroraSky: "#C8D8FF",
      auroraLilac: "#DCE2FF",
    },
    garnet: {
      // violet600 as text: violet500 drops to 3.6:1 on the aurora.
      accent: palette.violet600,
      accentSoft: "rgba(123, 85, 240, 0.10)",
      accentStrong: palette.violet500,
      accentStrongEnd: palette.violet600,
      accentLip: palette.violet800,
      auroraRose: "#FFD3DE",
      auroraSky: "#D3E0FF",
      auroraLilac: "#E4DBFF",
    },
  },
};

export function colorsFor(scheme: ColorScheme, side: Side): ColorTokens {
  return { ...(scheme === "dark" ? dark : light), ...accentFor[scheme][side] };
}

/**
 * Frosted glass for platforms without a live backdrop blur (Android, P-74). The see-through
 * veils above rely on blur to read as glass; without it they look transparent, so the panes
 * become dense frost instead: still a pane over the aurora with its sheen and shadow, but
 * nothing behind shows through.
 */
export const FROST: Record<ColorScheme, Pick<ColorTokens, "glassVeil" | "glassVeilSoft">> = {
  light: { glassVeil: "rgba(255, 255, 255, 0.92)", glassVeilSoft: "rgba(255, 255, 255, 0.78)" },
  dark: { glassVeil: "rgba(30, 26, 44, 0.94)", glassVeilSoft: "rgba(44, 38, 62, 0.86)" },
};

export function frosted(colors: ColorTokens, scheme: ColorScheme): ColorTokens {
  return { ...colors, ...FROST[scheme] };
}

/** Signature gradients (spec §4). Use for heroes and ceremonies only, never for body text backgrounds. */
export const gradients = {
  ruby: [palette.ruby900, palette.ruby500, palette.ruby200],
  sapphire: [palette.sapphire900, palette.sapphire500, palette.cyanGlow],
  together: [palette.ruby500, palette.violet500, palette.sapphire500],
  nightSky: [palette.ink950, palette.garnet800, palette.sapphire900],
  /** Light-mode counterpart of nightSky for hero screens. */
  dawn: [palette.ink50, "#F3E6EE", "#E4EAFB"],
} as const;

/** Initials avatar swatches per side (SETUP-04), named for screen readers. */
export const avatarSwatches = {
  ruby: [
    { name: "Rose", colors: ["#FF9EB5", "#E5486A"] },
    { name: "Crimson", colors: ["#E8536F", "#9E1636"] },
    { name: "Coral", colors: ["#FFB199", "#F0566E"] },
    { name: "Blush", colors: ["#FFD3DE", "#E8899E"] },
  ],
  sapphire: [
    { name: "Sky", colors: ["#A9C4FF", "#4F7BFF"] },
    { name: "Navy", colors: ["#5B8CFF", "#1A3FA8"] },
    { name: "Cyan", colors: ["#9BE7FF", "#2F80ED"] },
    { name: "Periwinkle", colors: ["#D3E0FF", "#8EA6F0"] },
  ],
  garnet: [
    { name: "Lilac", colors: ["#C9B6FF", "#7B55F0"] },
    { name: "Violet", colors: ["#9A7BFF", "#4B2BC2"] },
    { name: "Orchid", colors: ["#E4DBFF", "#9A7BFF"] },
    { name: "Plum", colors: ["#B68DD9", "#5B2A86"] },
  ],
} as const;

/** Abstract demo "photos" (SETUP-04, simulated): gradients, never real pictures. */
export const demoPhotoArt = {
  sunrise: { label: "Sunrise", colors: ["#FFD3A5", "#FF8FA3", "#8E6CF0"] },
  sea: { label: "Sea", colors: ["#B5F0FF", "#4F9BEA", "#1B3A8C"] },
  night: { label: "Night sky", colors: ["#3D2A8C", "#5A1730", "#0F2A6B"] },
  garden: { label: "Garden", colors: ["#D8F5C9", "#7FC8A0", "#2F7A6A"] },
  city: { label: "City lights", colors: ["#FFE1B8", "#B57BE0", "#2C2A6E"] },
  coffee: { label: "Coffee", colors: ["#F5E1C8", "#C08A5C", "#5A3420"] },
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
  /** Screen side margin in Daylight Glass (P-48). */
  gutter: 20,
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
 * Type scale. Families are PROVISIONAL (P-46): Fraunces, a high-contrast display serif, for
 * titles and emotional lines; Inter, a clean humanist sans, for UI (master style). Each weight
 * is its own font file, so components pick a family by weight instead of setting fontWeight.
 * Until the fonts load, the system fonts are used.
 */
export const typography = {
  families: {
    display: "Fraunces_600SemiBold",
    displayItalic: "Fraunces_400Regular_Italic",
    text: { "400": "Inter_400Regular", "500": "Inter_500Medium", "600": "Inter_600SemiBold" },
  },
  /** Wordmark and ceremony titles (welcome, milestones). */
  hero: { fontSize: 52, lineHeight: 58, fontWeight: "600" },
  /** Daylight Glass (P-48): iOS-style large title in the UI sans, tight tracking. */
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "600", letterSpacing: -0.6 },
  /** Welcome statement ("Two lives. One space."). */
  statement: { fontSize: 40, lineHeight: 46, fontWeight: "600", letterSpacing: -1 },
  /** Invitation code tiles (PAIR-02, PAIR-03). */
  code: { fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: 0 },
  /** One-question steps (create account). */
  question: { fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.4 },
  display: { fontSize: 34, lineHeight: 40, fontWeight: "600" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "600" },
  headline: { fontSize: 19, lineHeight: 25, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 24, fontWeight: "400" },
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
  // Fast and subtle (P-74): UI moves finish in under a fifth of a second; ceremonies keep theirs.
  duration: { instant: 80, quick: 140, standard: 180, gentle: 240, ceremony: 900 },
  spring: {
    ruby: { damping: 14, stiffness: 180 }, // a little livelier
    sapphire: { damping: 22, stiffness: 120 }, // calmer, floating
    garnet: { damping: 18, stiffness: 150 },
    /** Daylight Glass (P-48): presses, layout/progress, and success pops. */
    press: { damping: 18, stiffness: 420, mass: 0.6 },
    // Quick and settled, with almost no overshoot (P-74).
    smooth: { damping: 30, stiffness: 340 },
    bouncy: { damping: 18, stiffness: 320 },
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
