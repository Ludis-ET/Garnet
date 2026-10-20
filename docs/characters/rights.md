# Character rights path

> **Owner direction P-45 (2026-10-21):** the prototype's Ruby, Sapphire and Garnet now come only from images the owner generates (prompt: [docs/design/gemini-character-prompt.md](../design/gemini-character-prompt.md)) and keeps in the git-ignored `apps/mobile/assets/characters/`. The earlier code-drawn figures were removed. **No licence exists yet, U-10 stays unresolved and public distribution stays blocked.**

> Not legal advice, and **not a legal review or approval**. No lawyer has reviewed this. A qualified IP lawyer should review it before any distribution decision.

## The situation

Ruby, Sapphire and Garnet as named characters, with their designs, are from _Steven Universe_ (created by Rebecca Sugar; owned by Cartoon Network / Warner Bros. Discovery). Their names, likenesses, designs and distinctive expression are protected. §9 already notes that "private use does not automatically resolve every rights question".

## Product direction (owner, 2026-10-18)

**The intended Garnet experience uses the actual _Steven Universe_ characters Ruby, Sapphire and Garnet** (P-30, owner direction, not Accepted). This is product intent. It is not a rights grant and not a distribution authorization. **Rights and distribution authorization remain unresolved (U-10).** The gates below stay in force until that question is resolved. This document does not contain legal research.

## Gates (in force now)

| Gate                                                                                                  | Status                                                                                  |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No public distribution of any character asset, likeness-based icon, or physical figure until reviewed | **Blocked** (§9, §14)                                                                   |
| No official artwork, screenshots, audio or logos in the repo or the app                               | Enforced (`assets/characters/` is git-ignored; AI rules forbid generating close copies) |
| No manufacturing or selling of figures                                                                | Out of scope (§9)                                                                       |
| The repository stays private while any character-derived material exists                              | Required                                                                                |

## Paths

| Path                                                         | What it allows                                   | Effort / likelihood                                                            |
| ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| A. Licence from the rights holder                            | Use of the actual characters                     | Unlikely for a two-person private app; slow                                    |
| B. Strictly private builds with character art                | Two installs, not via public stores              | Lowest exposure; still not a rights grant; store review risk if ever submitted |
| C. Original gem-inspired characters                          | Everything, including public release and figures | **Not the product direction** (P-30); kept only as a recorded option           |
| D. Hybrid: C for anything distributed, B for personal extras | Public-safe app; private keepsakes               | Conflicts with P-30 for distributed builds                                     |

## How the paths relate to the product direction

- **P-30 is the product direction:** the actual characters in the intended app, not placeholders and not a private-build-only substitute.
- Paths A–D describe **rights and distribution routes**, not the character experience. Which route applies, and whether the app may be distributed beyond the two partners, is **U-10** (unresolved).
- Path B (private builds) describes a distribution channel, not a change of characters.
- No path is recommended in this document. The earlier recommendation of path C is withdrawn because it contradicts P-30.

## Reference only: what an original design would have to avoid

_Kept for the record. Original characters are **not** the product direction (P-30)._

Names of the existing characters in the shipped app (product name "Garnet" as a common gemstone word should be cleared separately); recognisable signature design elements (specific hairstyles, outfits, gem placement on the body, visors, colour-blocking patterns); voice lines, catchphrases and music. A designer should be briefed with the role table only, never with reference images of the existing characters.

## Next steps

1. Resolve rights and distribution authorization for the actual characters (U-10). Until then, public distribution stays blocked.
2. Decide asset sourcing and handling for the final experience (U-26), keeping the P-31 safeguards.
3. Legal review of the app name "Garnet" for trademark conflicts in app-store categories before any public release.
