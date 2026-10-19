# Open When letters

Spec for the §3 Open When row. Data: `open_when_letter` in [schema.sql](../../spikes/data-model/schema.sql) (draft → sealed → opened; recipient visibility enforced by RLS, F-05).

## Rules

1. A letter has an author, a recipient (the other partner), a prompt ("Open when you miss me", "Open when you can't sleep", or custom) and a body.
2. **Draft** — only the author sees it; autosaves; works offline.
3. **Sealed** — the recipient sees the prompt in their list; the body stays closed until they open it. The author can no longer edit.
   > **Known gap (unverified):** the draft database schema does **not** enforce this. Its row-level security lets the recipient read a sealed letter's full row, including the body, before opening (F-05). The rule must be enforced and verified at the API or data-access layer before anyone describes it as secure. A characterization test in F-05 pins the current database behaviour; it documents the gap and does not fix it.
4. **Opened** — the recipient chose to open it. Opening is private; the author is not notified unless the recipient opts in ("Let them know I opened it"), P-22.
5. Text first. Photo or voice attachments: **U-08** (feasibility and privacy).
6. Deletion follows the shared deletion policy; the tombstone type `letter` exists. Who may delete a sealed or opened letter, and whether the other partner is told, is open (**U-31**).

## Suggested prompts (copy review pending)

Open when you miss me · Open when you can't sleep · Open when you had a hard day · Open when you need a laugh · Open when we're counting down.
