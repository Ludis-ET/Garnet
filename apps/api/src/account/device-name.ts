/** The app names itself in its user agent: "Garnet (Android; Pixel 8)" (P-80). */
const GARNET = /^Garnet \(([^;)]+)(?:; ([^)]*))?\)/;
/** A model name as a person would read it: nothing that could be markup or a long string. */
const SAFE_MODEL = /^[\p{L}\p{N} ._+-]{1,40}$/u;

/**
 * A plain name for a session's device (SET-12). The raw user agent never leaves the API: it can
 * identify a browser build, and it is whatever the client chose to send.
 */
export function deviceName(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const garnet = GARNET.exec(ua);
  if (garnet !== null) {
    const model = garnet[2]?.trim() ?? "";
    if (model !== "" && SAFE_MODEL.test(model)) return model;
    return garnet[1]?.trim() === "iOS" ? "iPhone" : "Android phone";
  }
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android|okhttp/i.test(ua)) return "Android phone";
  if (/CFNetwork|Darwin/.test(ua)) return "iPhone";
  if (/Macintosh|Windows|Linux/.test(ua)) return "Computer";
  return "A device";
}
