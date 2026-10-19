@AGENTS.md

## Claude Code specifics

- `AGENTS.md` above is the full rule set; this file only adds Claude-specific notes.
- Before saying a task is complete, run `pnpm check` and quote the summary lines (tests passed, lint clean). If you could not run it, say so.
- When a request touches an **Unresolved** item (U-xx in `docs/decisions/decision-log.md`), stop and ask the user, or implement it as a required option with no default, and say which you did.
- Prefer the dedicated Read/Edit/Grep tools. On this Windows machine the Bash tool is Git Bash; PowerShell is also available.
- Do not commit or push unless explicitly asked.
