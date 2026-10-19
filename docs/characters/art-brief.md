# Character art brief

For §9 and §13C. **Product direction: the actual characters Ruby, Sapphire and Garnet** (P-30, owner direction, not Accepted). **Rights and distribution authorization remain unresolved** ([rights.md](./rights.md), U-10). Public distribution stays blocked. Asset sourcing and handling are open (U-26), and the P-31 safeguards apply: no official artwork in the repo, and agents do not generate, trace or commit character art.

## Characters and their roles in the app

| Character   | Colour      | Personality (as used in the app)                       | In the app                                      |
| ----------- | ----------- | ------------------------------------------------------ | ----------------------------------------------- |
| Ruby ❤️     | Warm red    | Energetic, impulsive warmth, big feelings, quick laugh | One partner's presence; action moments          |
| Sapphire 💙 | Cool blue   | Calm, perceptive, gentle, quietly funny                | The other partner's presence; listening moments |
| Garnet 💜   | Deep purple | Both together: composed, protective, playfully chaotic | Home "living world", Spark keeper, milestones   |

Neither Ruby nor Sapphire is assigned to a specific partner by default. Whether each person picks their own gem during setup is an open question (**U-22**).

## Style direction

- **3D-first** (§9): soft, stylized, toy-like proportions; faceted gem materials with subsurface glow; readable silhouettes.
- **Lightweight fallbacks:** every animated asset has a pre-rendered and a static version (§9, F-02).
- Light and dark backgrounds; no meaning carried by colour alone (Ruby, Sapphire and Garnet also differ by shape and silhouette).
- Never sad, angry or abandoned (§2, §7). "Resting" is a cosy nap, not a sulk.

## Pose and expression inventory

| ID   | Pose / expression      | Characters               | Used in                       | Priority |
| ---- | ---------------------- | ------------------------ | ----------------------------- | -------- |
| C-01 | Idle (breathe, blink)  | all three                | Home, widget (static)         | P0       |
| C-02 | Wave hello             | Ruby, Sapphire           | Onboarding, pairing success   | P0       |
| C-03 | Happy / laughing       | all three                | Shared moment confirmation    | P0       |
| C-04 | Listening (lean in)    | Sapphire, Garnet         | Support signal received       | P0       |
| C-05 | Heart / hug            | Ruby + Sapphire          | Pairing success, milestones   | P0       |
| C-06 | Holding the crystal    | Garnet                   | Spark                         | P0       |
| C-07 | Cosy nap               | Garnet                   | Spark resting, quiet hours    | P1       |
| C-08 | Thinking (loading)     | any                      | Loading states                | P1       |
| C-09 | Writing a letter       | Ruby, Sapphire           | Open When                     | P1       |
| C-10 | Celebrating (confetti) | all three                | Milestones 3–365              | P1       |
| C-11 | Fusion moment          | Ruby + Sapphire → Garnet | 100 / 365 milestones, pairing | P2       |
| C-12 | Waving goodnight       | any                      | Evening widget nudge          | P2       |

## Animation inventory

| ID   | Animation     | Length  | Loop | Trigger             | Reduced-motion fallback  |
| ---- | ------------- | ------- | ---- | ------------------- | ------------------------ |
| A-01 | Idle breathe  | 3–4 s   | yes  | Home visible        | Static C-01              |
| A-02 | Moment shared | ≤ 1.2 s | no   | Share succeeded     | Static C-03 + haptic     |
| A-03 | Signal sent   | ≤ 1 s   | no   | Signal sent         | Static frame             |
| A-04 | Listening     | 2 s     | yes  | Support signal open | Static C-04              |
| A-05 | Crystal grows | ≤ 1.5 s | no   | Spark grew          | Crossfade between stages |
| A-06 | Milestone     | ≤ 3 s   | no   | Milestone reached   | Static C-10 + text       |
| A-07 | Loading       | 1–2 s   | yes  | > 400 ms wait       | Static C-08              |
| A-08 | Nap           | 4 s     | yes  | Spark resting       | Static C-07              |

Proposed budgets for F-02 (**P-27**, not approved): first meaningful paint of Home ≤ 1 s on the slowest target device; animation at 60 fps (≥ 55 p95); initial character payload ≤ 2 MB, the rest lazy-loaded. Proxy-asset measurements (P-31) do not establish performance of the final Ruby, Sapphire and Garnet assets.

## App icon concepts (§9)

| Concept | Idea                                                          | Risk                                                                     |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| I-1     | A red and a blue facet overlapping into a purple centre facet | Very legible; least "character"; departs from §9's character composition |
| I-2     | Garnet's face inside a faceted heart                          | Character likeness; distribution gated by U-10                           |
| I-3     | Ruby, Sapphire and Garnet silhouettes forming one crystal     | Closest to §9; busy below 48 px; gated by U-10                           |

Requirements: readable at 29 pt (iOS) and 48 dp (Android); adaptive-icon safe zone; light, dark and tinted variants on iOS; monochrome Android themed icon. **No working icon is chosen (U-25).** I-1 to I-3 are concepts only; none is recommended or accepted. §9's direction is "a composition featuring Ruby, Sapphire, and Garnet".

## 3D vs 2D — recommendation (pending F-02)

**Recommended:** ship v1 with **pre-rendered** animation (Rive or Lottie, or sprite sheets rendered from the 3D models) and static fallbacks. Add **runtime 3D** (react-native-filament or three.js via expo-gl) on Home only if F-02 meets the budgets on the actual devices (U-01). This keeps the 3D-first art direction (models are the source of truth) without betting launch performance on real-time 3D.
