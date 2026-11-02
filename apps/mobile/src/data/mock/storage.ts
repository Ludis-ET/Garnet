/**
 * Where the demo keeps its state between launches: the browser's localStorage on the web.
 * Android uses a file instead (`storage.android.ts`, P-73). Every call swallows errors: a
 * private window, a full disk or no storage at all just means the demo starts fresh.
 */
export function readStored(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // Ignore quota or access errors
  }
}

export function clearStored(key: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors
  }
}
