import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up (or down) to its target over about a second, easing out. Reduced
 * motion shows the target at once. Null holds the last value.
 */
export function useCountUp(target: number | null, still: boolean, duration = 1100): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target === null) return;
    const start = from.current;
    const t0 = Date.now();
    const length = still ? 0 : duration;
    let frame = 0;
    const step = () => {
      const p = length === 0 ? 1 : Math.min(1, (Date.now() - t0) / length);
      const v = start + (target - start) * (1 - (1 - p) ** 3);
      setValue(v);
      from.current = v;
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, still, duration]);
  return value;
}
