import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  colorsFor,
  elevation,
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
}

interface ThemeControls {
  theme: Theme;
  schemePreference: SchemePreference;
  setSchemePreference: (preference: SchemePreference) => void;
  setSide: (side: Side) => void;
}

const ThemeContext = createContext<ThemeControls | null>(null);

function buildTheme(scheme: ColorScheme, side: Side, reduceMotion: boolean): Theme {
  return {
    scheme,
    side,
    colors: colorsFor(scheme, side),
    spacing,
    radii,
    typography,
    motion,
    gradients,
    elevation,
    reduceMotion,
  };
}

export function ThemeProvider({
  children,
  initialSide = "garnet",
  initialSchemePreference = "system",
}: {
  children: ReactNode;
  initialSide?: Side;
  initialSchemePreference?: SchemePreference;
}) {
  const system = useColorScheme();
  const reduceMotion = useReducedMotion();
  const [schemePreference, setSchemePreference] =
    useState<SchemePreference>(initialSchemePreference);
  const [side, setSide] = useState<Side>(initialSide);

  // Dark-first: when the system gives no answer, use dark.
  const scheme: ColorScheme =
    schemePreference === "system" ? (system === "light" ? "light" : "dark") : schemePreference;

  const value = useMemo<ThemeControls>(
    () => ({
      theme: buildTheme(scheme, side, reduceMotion),
      schemePreference,
      setSchemePreference,
      setSide,
    }),
    [scheme, side, reduceMotion, schemePreference],
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
  const { schemePreference, setSchemePreference, setSide } = useThemeControls();
  return { schemePreference, setSchemePreference, setSide };
}

/** Shared pages (Home hero, anniversary, Our World) render in the Garnet accent. */
export function useSideTheme(side: Side): Theme {
  const theme = useTheme();
  return useMemo(
    () => buildTheme(theme.scheme, side, theme.reduceMotion),
    [theme.scheme, side, theme.reduceMotion],
  );
}
