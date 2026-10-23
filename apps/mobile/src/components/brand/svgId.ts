import { useId } from "react";

/**
 * A unique, url()-safe id for SVG gradients. Several drawings share one document on web (and a
 * hidden earlier screen stays mounted in the stack), so fixed ids like "facetRuby" would make
 * `url(#facetRuby)` resolve to someone else's gradient, sometimes an invisible one.
 */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
