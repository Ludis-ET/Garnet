/**
 * Pure SVG path generators for the stage particles. Numbers are rounded so paths stay compact
 * and deterministic.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

export function heartPath(cx: number, cy: number, s: number): string {
  return [
    `M${r2(cx)},${r2(cy + s * 0.9)}`,
    `C${r2(cx - s * 0.15)},${r2(cy + s * 0.7)} ${r2(cx - s)},${r2(cy + s * 0.25)} ${r2(cx - s)},${r2(cy - s * 0.2)}`,
    `C${r2(cx - s)},${r2(cy - s * 0.75)} ${r2(cx - s * 0.35)},${r2(cy - s * 0.95)} ${r2(cx)},${r2(cy - s * 0.45)}`,
    `C${r2(cx + s * 0.35)},${r2(cy - s * 0.95)} ${r2(cx + s)},${r2(cy - s * 0.75)} ${r2(cx + s)},${r2(cy - s * 0.2)}`,
    `C${r2(cx + s)},${r2(cy + s * 0.25)} ${r2(cx + s * 0.15)},${r2(cy + s * 0.7)} ${r2(cx)},${r2(cy + s * 0.9)}Z`,
  ].join(" ");
}

export function starPath(
  cx: number,
  cy: number,
  outer: number,
  inner = outer * 0.45,
  points = 5,
): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    parts.push(`${i === 0 ? "M" : "L"}${r2(cx + Math.cos(a) * r)},${r2(cy + Math.sin(a) * r)}`);
  }
  return `${parts.join(" ")}Z`;
}

/** A "z" for sleepy particles. */
export function zPath(cx: number, cy: number, s: number): string {
  return `M${r2(cx - s)},${r2(cy - s)} H${r2(cx + s)} L${r2(cx - s)},${r2(cy + s)} H${r2(cx + s)}`;
}

/** An eighth note (head + stem + flag). */
export function notePath(cx: number, cy: number, s: number): string {
  return [
    `M${r2(cx + s * 0.35)},${r2(cy + s * 0.55)} V${r2(cy - s)}`,
    `Q${r2(cx + s * 0.95)},${r2(cy - s * 0.7)} ${r2(cx + s * 0.85)},${r2(cy - s * 0.15)}`,
  ].join(" ");
}
