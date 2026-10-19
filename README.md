# Garnet 💜

> "I can't be there with you right now, but I can still be part of your day."

A private app for exactly two partners living apart. Ruby ❤️ + Sapphire 💙 → Garnet 💜.

**Status: Phase 1 — closed (2026-10-19).** All eight §16 exit criteria are met. The known limitations carried forward (device behaviour, API authorization, Open When body enforcement, provider behaviour, character rights) are on the [Phase 1 status board](docs/README.md#phase-1-status-board). No decision has been Accepted. Phase 2 has not started and needs the owner's approval: [backlog](docs/phase-2/backlog.md).

## Quick start

Requires Node ≥ 24 and pnpm 10 (`corepack enable`).

```sh
pnpm install
pnpm check            # format, lint, strict typecheck, 100 tests across 3 packages
pnpm spike:media      # F-07 media-retry spike: 22 tests against local S3 storage (needs Docker Desktop)
pnpm mutation         # reproducible mutation checks (add --with-docker to include F-07)
```

## What's here

| Path                                        | Contents                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [docs/](docs/README.md)                     | Scope record, decision log, product, UX, feature specs, architecture, ADRs, feasibility results, Phase 2 backlog |
| [packages/domain](packages/domain/)         | Shared business rules: shared day across GMT/BST ↔ Addis Ababa, Shared Spark engine, signals                     |
| [spikes/offline-sync](spikes/offline-sync/) | Sync protocol tested in an in-memory simulation with fault injection (F-04)                                      |
| [spikes/media-retry](spikes/media-retry/)   | Server-side media upload and retry against local SeaweedFS in Docker (F-07)                                      |
| [spikes/data-model](spikes/data-model/)     | Draft PostgreSQL schema with row-level security, tested on PGlite (F-05)                                         |
| [AGENTS.md](AGENTS.md)                      | Rules for AI coding agents (also loaded via `CLAUDE.md`)                                                         |

## Decisions waiting on the owner

The most important open items: **U-01** target phones · **U-02** shared-day cutoff · **U-03/U-04** Spark grace rules · **U-10** character rights and distribution (actual characters are the direction, P-30) · **U-20** what happens to shared memories when an account is deleted. Full list: [decision log](docs/decisions/decision-log.md).

## First commit and remote

The Phase 1 closeout commit exists **locally only**; no remote is configured. The repository must stay **private** while character-derived material may exist ([rights gate](docs/characters/rights.md)). If you are starting from an uncommitted copy, the first commit is:

```sh
git status                      # review what will be included (node_modules, .cache, .env and character assets are ignored)
git add -A
git commit -m "Phase 1: scope, decisions, specs, architecture and feasibility evidence"

# Create an EMPTY, PRIVATE repository on your chosen host, then:
git remote add origin <your-private-repo-url>
git push -u origin main         # this triggers .github/workflows/ci.yml for the first time
```

CI (`.github/workflows/ci.yml`) runs `pnpm check`. It does not run the Docker-based F-07 spike or the mutation checks; run those locally.
