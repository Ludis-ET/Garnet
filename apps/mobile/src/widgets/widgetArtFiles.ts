/**
 * The small widget copies of the owner's images (P-73), made by scripts/make-widget-art.py into
 * the git-ignored assets/characters/widget/. Empty on a fresh checkout: the widgets then show
 * words and gem colours only. Keys are lower-case file names without the extension.
 */
const files = require.context("../../assets/characters", true, /^\.\/widget\/[^/]+\.png$/i);

export const widgetArtFiles: Readonly<Record<string, number>> = Object.fromEntries(
  files.keys().map((key) => [
    key
      .replace(/^\.\/widget\//, "")
      .replace(/\.png$/i, "")
      .toLowerCase(),
    files(key) as number,
  ]),
);
