import { useEffect, useRef } from "react";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A gentle horizontal shake (8 pt, three swings) each time `key` changes to a new defined value:
 * a wrong sign-in, a new field error. Never on first render; nothing under reduced motion, where
 * the error text and icon carry the message on their own (P-48).
 */
export function useShake(key: unknown) {
  const { reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const previous = useRef(key);
  useEffect(() => {
    const changed = previous.current !== key;
    previous.current = key;
    if (!changed || key === undefined || key === null || key === false || reduceMotion) return;
    const swing = (to: number) => withTiming(to, { duration: 55 });
    x.set(withSequence(swing(-8), swing(8), swing(-6), swing(6), swing(-3), withSpring(0)));
  }, [key, reduceMotion, x]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
}

/**
 * A small pop (scale up, settle back with a bouncy spring) whenever `key` changes: a checklist
 * item turning green, a crystal facet lighting up. Still under reduced motion.
 */
export function usePop(key: unknown, amount = 0.18) {
  const { reduceMotion, motion } = useTheme();
  const s = useSharedValue(1);
  const previous = useRef(key);
  useEffect(() => {
    const changed = previous.current !== key;
    previous.current = key;
    if (!changed || reduceMotion) return;
    s.set(
      withSequence(withTiming(1 + amount, { duration: 110 }), withSpring(1, motion.spring.bouncy)),
    );
  }, [key, reduceMotion, s, amount, motion.spring.bouncy]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
}
