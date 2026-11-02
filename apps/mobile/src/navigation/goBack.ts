import { router, type Href } from "expo-router";

/**
 * Back, or to `fallback` when there is nothing to go back to (the page was opened directly, by a
 * link or after a reload on web). `router.back()` alone then does nothing and logs "GO_BACK was
 * not handled by any navigator".
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
