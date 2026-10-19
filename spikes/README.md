# Spikes

Phase 1 feasibility evidence. **Not production code** and never imported by apps or packages. Anything promoted to Phase 2 is rewritten into `packages/` or `apps/` together with its tests.

| Spike                           | Proves                                                                                                                                 | Write-up                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [offline-sync](./offline-sync/) | Idempotent retries, tombstones, no resurrection, private feed, no lost words, convergence                                              | [F-04](../docs/feasibility/F-04-offline-sync.md) |
| [media-retry](./media-retry/)   | Server-side media upload: presigned PUT, retry, idempotent commit, validation, outages, purge, orphan reconciliation (local SeaweedFS) | [F-07](../docs/feasibility/F-07-media-retry.md)  |
| [data-model](./data-model/)     | Draft schema; RLS privacy; IDOR resistance; tombstones; media purge; pairing rules                                                     | [F-05](../docs/feasibility/F-05-data-model.md)   |

The timezone spike (F-06) lives in `packages/domain`, because its code is the reference implementation.

Rules: spikes keep their tests green in `pnpm check` (F-07 runs separately via `pnpm spike:media`, because it needs Docker). When you change a spike, run `pnpm mutation` (with `--with-docker` for F-07) and keep every mutant's expected outcome.
