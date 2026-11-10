/**
 * The fusion plays each time the app is opened, once both partners have finished setup (owner
 * direction, P-99). Kept in memory only: a fresh launch plays it again; moving around the app
 * doesn't.
 */
let played = false;

export function fusionPlayedThisLaunch(): boolean {
  return played;
}

export function markFusionPlayed(): void {
  played = true;
}

/** Tests only. */
export function resetFusionForTest(): void {
  played = false;
}
