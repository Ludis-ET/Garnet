/** WCAG 2.x relative-luminance contrast ratio between two opaque #RRGGBB colours. */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (match?.[1] === undefined) throw new RangeError(`Expected #RRGGBB, got ${hex}`);
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Blend a colour over an opaque background: `#RRGGBB` passes through; `rgba(r, g, b, a)` is
 * composited (glass veils and aurora orbs, P-48). Returns `#RRGGBB` for contrastRatio.
 */
export function composite(color: string, background: string): string {
  const bg = /^#([0-9a-f]{6})$/i.exec(background);
  if (bg?.[1] === undefined) throw new RangeError(`Expected #RRGGBB, got ${background}`);
  if (color.startsWith("#")) return color;
  const m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/.exec(color);
  if (m === null) throw new RangeError(`Expected #RRGGBB or rgba(), got ${color}`);
  const alpha = Number(m[4]);
  const base = parseInt(bg[1], 16);
  const under = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  const out = [m[1], m[2], m[3]].map((c, i) =>
    Math.round(Number(c) * alpha + (under[i] ?? 0) * (1 - alpha)),
  );
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
