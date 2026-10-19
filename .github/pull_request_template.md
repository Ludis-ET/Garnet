## What and why

<!-- One paragraph. Link the decision IDs (D-/P-/U-) and docs this change implements. -->

## Checklist

- [ ] `pnpm check` passes locally
- [ ] No unresolved decision (U-xx) is silently given a default; any new choice is recorded in `docs/decisions/decision-log.md`
- [ ] Privacy: no private draft, letter or signal content can reach the partner, logs, push payloads, analytics or the widget
- [ ] Authorization: every new data path is relationship-scoped, with a cross-relationship test
- [ ] Time: UTC instants, named IANA zones, Temporal API; no fixed offsets or `Date` arithmetic in domain code
- [ ] Sync: new writes are idempotent (mutationId), versioned, and respect tombstones
- [ ] Copy: kind, no guilt or blame, no "seen" claims (see `docs/ux/voice-and-copy.md`)
- [ ] Accessibility: labels, contrast, no colour-only meaning, reduced motion
- [ ] Docs updated where behaviour changed
