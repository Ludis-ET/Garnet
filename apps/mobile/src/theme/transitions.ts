import { FadeIn, FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";

/**
 * Fast, subtle motion everywhere (owner direction 2026-10-29, P-74): no springs, no bounces and
 * no staggered cascades when a page, popup or list appears. Each preset is a short fade; sheets
 * and toasts also rise a few points. Under Reduce Motion, screens still skip these entirely.
 */

/** Content appearing on a page or in a card. */
export const ENTER = FadeIn.duration(140);
/** A popup, menu, badge or bubble appearing. */
export const POP = FadeIn.duration(120);
/** A bottom sheet or a toast: a short fade with a small rise. */
export const SHEET = FadeInUp.duration(180);
/** Anything disappearing. */
export const EXIT = FadeOut.duration(100);
/** Items moving when a list changes. */
export const LAYOUT = LinearTransition.duration(160);

/** Native stack page changes: a quick fade instead of a slide (P-74). */
export const PAGE = { animation: "fade", animationDuration: 160 } as const;
