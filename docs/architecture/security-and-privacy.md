# Security and privacy model

Requirements: §11, §12. This is a lightweight threat model for a two-person app on the public internet.

## Assets, ranked

1. Private drafts and private letters (one partner must never see the other's).
2. Shared content and media (only the two partners).
3. Emotional signals and their timing (sensitive metadata).
4. Credentials and sessions.
5. Spark history (must not become a blame record).

## Threats and controls

| Threat                                  | Control                                                                                | Evidence                    |
| --------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| IDOR / BOLA: guessing or altering ids   | Session-derived relationship; scoped queries; RLS; 404 for not-yours                   | F-05                        |
| Partner sees private draft              | RLS on entries; audience-scoped feed; drafts excluded from Spark; export under RLS     | F-04, F-05                  |
| Stale device resurrects deleted content | Tombstones, `gone`, idempotent creates by id, feed acknowledgements                    | F-04, F-05                  |
| Invitation hijack or replay             | Hashed, single-use, ≤ 24 h, user from context, generic errors, rate limits             | F-05                        |
| Credential stuffing                     | argon2id, rate limits, breached-password check, no enumeration                         | ADR-0006                    |
| Token theft from device                 | Secure storage; short access tokens; refresh rotation with reuse detection             | ADR-0006                    |
| Media link leakage                      | Private bucket; minutes-long presigned URLs; random keys                               | ADR-0005                    |
| Lock-screen shoulder-surfing            | Generic previews by default; identical across levels; neutral widget                   | domain tests                |
| Content in logs or crash reports        | Allow-listed log fields; scrubbing; no content in push payloads                        | environments-and-updates.md |
| Location leakage via photos             | EXIF stripping on commit                                                               | ADR-0005                    |
| Supply-chain compromise                 | Lockfile; `minimumReleaseAge` 7 days; blocked install scripts; pinned CI actions       | pnpm-workspace.yaml         |
| Secrets in the repo                     | `.gitignore` patterns; env files never committed; secrets in the host's secret manager | .gitignore                  |

## Privacy rules (non-negotiable)

- No advertising SDKs; no analytics on content; no sale or unrelated use of data (§2, §11).
- No relationship-health scores, rankings, per-partner comparisons, read receipts or "seen" claims.
- Data minimization: tombstones and the change feed hold ids only; Spark holds no per-partner data; signals expire (U-09).
- Each partner controls only their own preferences and private content.

## Accessibility is a requirement

Contrast (WCAG 2.2 AA), screen-reader labels, status never by colour alone, reduced motion respected, Dynamic Type / font scaling (§12).
