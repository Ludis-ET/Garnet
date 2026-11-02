import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, useColorScheme } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  colorsFor,
  elevation,
  frosted,
  gradients,
  motion,
  radii,
  spacing,
  typography,
  type ColorScheme,
  type ColorTokens,
  type Side,
} from "./tokens";

export type SchemePreference = "system" | ColorScheme;
/** SETUP-06 accent intensity: "rich" washes the canvas in the person's side colour. */
export type Intensity = "subtle" | "rich";

export interface Theme {
  scheme: ColorScheme;
  /** The viewer's personal side. Shared pages use `withSide("garnet")`. */
  side: Side;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  motion: typeof motion;
  gradients: typeof gradients;
  elevation: typeof elevation;
  /** True when the OS asks for reduced motion. Every animation must respect it. */
  reduceMotion: boolean;
  /** True when the OS asks for less transparency (iOS): glass panes become solid (P-48). */
  reduceTransparency: boolean;
  /** The person's chosen accent intensity (SETUP-06). */
  intensity: Intensity;
}

interface ThemeControls {
  theme: Theme;
  schemePreference: SchemePreference;
  setSchemePreference: (preference: SchemePreference) => void;
  setSide: (side: Side) => void;
  setIntensity: (intensity: Intensity) => void;
  /** Calm motion in the app whatever the phone says (Settings › Motion). */
  setForceReduceMotion: (on: boolean) => void;
}

const ThemeContext = createContext<ThemeControls | null>(null);

function buildTheme(
  scheme: ColorScheme,
  side: Side,
  reduceMotion: boolean,
  reduceTransparency: boolean,
  intensity: Intensity = "subtle",
): Theme {
  return {
    intensity,
    scheme,
    side,
    // Android has no live backdrop blur here, so its glass is frosted (P-74).
    colors:
      Platform.OS === "android"
        ? frosted(colorsFor(scheme, side), scheme)
        : colorsFor(scheme, side),
    spacing,
    radii,
    typography,
    motion,
    gradients,
    elevation,
    reduceMotion,
    reduceTransparency,
  };
}

/** iOS "Reduce Transparency". The setting (and its API) only exists on iOS; elsewhere false. */
function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (live) setOn(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

export function ThemeProvider({
  children,
  initialSide = "garnet",
  // Daylight Glass opens in light (owner direction P-48); dark stays selectable.
  initialSchemePreference = "light",
}: {
  children: ReactNode;
  initialSide?: Side;
  initialSchemePreference?: SchemePreference;
}) {
  const system = useColorScheme();
  const systemReduceMotion = useReducedMotion();
  // Settings › Motion can calm Garnet even when the phone doesn't ask to (P-66).
  const [forceReduceMotion, setForceReduceMotion] = useState(false);
  const reduceMotion = systemReduceMotion || forceReduceMotion;
  const reduceTransparency = useReduceTransparency();
  const [schemePreference, setSchemePreference] =
    useState<SchemePreference>(initialSchemePreference);
  const [side, setSide] = useState<Side>(initialSide);
  const [intensity, setIntensity] = useState<Intensity>("subtle");

  // When following the system and it gives no answer, use light (P-48).
  const scheme: ColorScheme =
    schemePreference === "system" ? (system === "dark" ? "dark" : "light") : schemePreference;

  const value = useMemo<ThemeControls>(
    () => ({
      theme: buildTheme(scheme, side, reduceMotion, reduceTransparency, intensity),
      schemePreference,
      setSchemePreference,
      setSide,
      setIntensity,
      setForceReduceMotion,
    }),
    [scheme, side, reduceMotion, reduceTransparency, schemePreference, intensity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeControls(): ThemeControls {
  const controls = useContext(ThemeContext);
  if (controls === null) throw new Error("useTheme must be used inside <ThemeProvider>");
  return controls;
}

export function useTheme(): Theme {
  return useThemeControls().theme;
}

export function useThemeSettings(): Omit<ThemeControls, "theme"> {
  const { schemePreference, setSchemePreference, setSide, setIntensity, setForceReduceMotion } =
    useThemeControls();
  return { schemePreference, setSchemePreference, setSide, setIntensity, setForceReduceMotion };
}

/**
 * Everything inside renders in one side's accent, e.g. shared pages (Home, anniversary, Our
 * World) in Garnet violet while personal pages follow the viewer's own side (master style).
 */
export function SideScope({ side, children }: { side: Side; children: ReactNode }) {
  const controls = useThemeControls();
  const { scheme, reduceMotion, reduceTransparency, intensity } = controls.theme;
  const value = useMemo<ThemeControls>(
    () => ({
      ...controls,
      theme: buildTheme(scheme, side, reduceMotion, reduceTransparency, intensity),
    }),
    [controls, scheme, side, reduceMotion, reduceTransparency, intensity],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Shared pages (Home hero, anniversary, Our World) render in the Garnet accent. */
export function useSideTheme(side: Side): Theme {
  const theme = useTheme();
  return useMemo(
    () =>
      buildTheme(theme.scheme, side, theme.reduceMotion, theme.reduceTransparency, theme.intensity),
    [theme.scheme, side, theme.reduceMotion, theme.reduceTransparency, theme.intensity],
  );
}
