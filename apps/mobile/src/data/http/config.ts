/**
 * Where the API is, and which areas use it (P-76). Both are set when the app is built:
 *   EXPO_PUBLIC_API_URL=http://127.0.0.1:3000   (the PC, through `adb reverse`)
 *   EXPO_PUBLIC_API_AREAS=auth,pairing,setup    (areas moved from mock data to the API)
 * Unset, the app runs on mock data only, exactly as before. Areas move one at a time (B1 on).
 */
export const API_AREAS = ["auth", "pairing", "setup", "settings", "profile"] as const;
export type ApiArea = (typeof API_AREAS)[number];

/** A usable http(s) base URL, or null. */
export function parseApiUrl(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** The known areas named in a comma-separated list; unknown names are ignored. */
export function parseApiAreas(raw: string | undefined): ReadonlySet<ApiArea> {
  const names = (raw ?? "").split(",").map((s) => s.trim());
  return new Set(API_AREAS.filter((a) => names.includes(a)));
}

// Expo inlines EXPO_PUBLIC_ variables at build time; they must be read with dot access.
export const API_URL = parseApiUrl(process.env.EXPO_PUBLIC_API_URL);
export const API_AREAS_ON = parseApiAreas(process.env.EXPO_PUBLIC_API_AREAS);
