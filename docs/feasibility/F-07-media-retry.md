# F-07 — Server-side media upload and retry

**Result: ✅ Verified server-side, locally, against SeaweedFS S3-compatible storage in Docker** (22 tests, run 2026-10-19). Direction: **P-32** (owner direction). Findings proposed as **P-38** (not Accepted).

**What this does _not_ verify:** phone-level background upload and resume (**B-43**, needs real devices); the chosen hosting provider's S3 behaviour (U-07, undecided); production HTTP endpoints, authentication and multi-connection concurrency. SeaweedFS behaviour is evidence about SeaweedFS, not about AWS or any other provider.

## Environment

| Item           | Value                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker         | Docker Desktop 29.8.2 (started locally 2026-10-19; the daemon was previously stopped)                                                                                                                                                        |
| Storage        | `chrislusf/seaweedfs:4.46` pinned by digest `sha256:08d5161…5b62` ([compose.yaml](../../spikes/media-retry/compose.yaml)). Released 2026-09-08.                                                                                              |
| Why SeaweedFS  | MinIO images are no longer published on Docker Hub or quay.io (checked 2026-10-19). SeaweedFS **enforces SigV4**: anonymous requests get 403, so the presigned-URL results mean something.                                                   |
| Credentials    | A **random local-only identity generated on every run** by [`scripts/local-credentials.mjs`](../../spikes/media-retry/scripts/local-credentials.mjs), written to git-ignored `.cache/` and deleted afterwards. No credentials are committed. |
| Metadata       | The F-05 draft schema (`media`, `media_purge_queue`, `tombstone`, RLS) in PGlite                                                                                                                                                             |
| Client library | `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` 3.1149.0 (Apache-2.0), **test-only devDependencies of this spike**, used to create presigned URLs. They are an S3 client, not an emulator.                                          |
| Model          | [`media-service.ts`](../../spikes/media-retry/src/media-service.ts): a reference model of ADR-0005, **not** the production service                                                                                                           |

## Reproduce

```sh
# requires Docker Desktop running
pnpm spike:media                  # starts storage, runs the 22 tests, tears down
pnpm mutation --with-docker       # also checks that each media guard is load-bearing
```

The spike is **not** part of `pnpm check` and does not run in CI: CI has no Docker step, and CI has never run.

## Results (22/22 passed)

| Scenario                                                                          | Outcome                                                                                                                                              |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage rejects unsigned PUTs and tampered signatures                             | 403 for both; nothing stored                                                                                                                         |
| Happy path: request → presigned PUT → commit                                      | `ready`; stored bytes match the declared SHA-256                                                                                                     |
| **Interrupted upload** (connection dropped after 100 KB of 512 KB)                | Nothing stored; commit answers `not-uploaded`; row stays `pending_upload`                                                                            |
| **Retry of the same logical upload** (same media id)                              | Same object key, fresh URL; upload succeeds; **one** row; finalized **once**                                                                         |
| Duplicate PUT of the same object                                                  | Harmless: one key, same bytes                                                                                                                        |
| **Expired presigned URL** (1 s TTL)                                               | 403; the retry gets a fresh URL for the same object                                                                                                  |
| **Repeated upload requests** (×5)                                                 | One media row, one object key                                                                                                                        |
| Media id reused with different parameters                                         | Rejected (`media-id-reuse`)                                                                                                                          |
| **Repeated and concurrent commits** (×5 concurrent + 1)                           | All answer `ready`; exactly **one** `pending_upload → ready` transition                                                                              |
| Partner tries to register media on the author's entry                             | Refused by RLS (`42501`)                                                                                                                             |
| Wrong content (not a JPEG)                                                        | `rejected` (`content-type-mismatch`); object deleted                                                                                                 |
| Checksum mismatch                                                                 | `rejected` (`checksum-mismatch`); object deleted                                                                                                     |
| Content-Type different from the signed one                                        | Storage refuses with 403                                                                                                                             |
| Body larger or smaller than the signed Content-Length                             | Storage refuses with 403 (SeaweedFS enforces the signed length)                                                                                      |
| A lax provider stores a wrong-sized object anyway (simulated by writing directly) | Commit still `rejected` (`size-mismatch`); object deleted                                                                                            |
| Unsupported type / size above the spike limit                                     | Refused before any URL is issued (real limits: U-08)                                                                                                 |
| **Storage outage during upload** (container paused)                               | Upload times out; after recovery the retry succeeds and commits                                                                                      |
| **Storage outage during commit**                                                  | Commit fails without changing state; the retry finalizes once                                                                                        |
| **Storage outage during purge**                                                   | Purge stays queued with `attempts = 1`; after recovery it completes and the object is gone                                                           |
| Entry deleted, then request/commit                                                | Both answer `gone`; the queued purge removes the object; the queue empties                                                                           |
| **Late upload after deletion** (stale device with a still-valid URL)              | The object **lands in storage with no row** — see finding 1; reconciliation removes it                                                               |
| Upload never committed (older than 24 h)                                          | Orphan sweep deletes the row; purge removes the object                                                                                               |
| Final consistency                                                                 | Every `ready` row has its exact bytes; no rejected object remains; every stored object belongs to a row; purge queue empty; no media finalized twice |

## Mutation check (reproducible, `pnpm mutation --with-docker`, run 2026-10-19)

| Mutant | Guard removed                                                | Outcome |
| ------ | ------------------------------------------------------------ | ------- |
| F07-1  | Conditional `pending_upload → ready` (finalize exactly once) | killed  |
| F07-2  | Commit-time validation                                       | killed  |
| F07-3  | Storage reconciliation of unreferenced objects               | killed  |
| F07-4  | Failed purges stay queued (attempt count)                    | killed  |
| F07-5  | Commit after deletion answers `gone`                         | killed  |
| F07-6  | Media id reuse with different parameters                     | killed  |

## Findings (proposed as P-38)

1. **A presigned URL outlives deletion.** After an entry is deleted and its purge has run, a device holding a still-valid presigned URL can still upload, creating an object no row references. Cleaning up at delete time is not enough. **Minimal resolution:** a periodic storage reconciliation that deletes unreferenced objects (implemented in the spike as `reconcileStorage`), plus short presign TTLs. Both are verified here.
2. **SDK handler timeouts did not bound calls to a frozen backend.** With storage paused, the SDK's `requestTimeout` configuration did not stop a call: Docker's port forwarder still accepted the TCP connection, and the first run hung until the test timed out. **Resolution:** every storage call carries a hard `AbortSignal` deadline. Verified by the three outage tests.
3. **Commit needs the entry id.** Media rows cascade away with their entry, so a commit carrying only the media id cannot tell "deleted" from "unknown". **Resolution:** commit requests carry the entry id and check its tombstone. Verified.
4. **Signed headers are enforced by SeaweedFS.** Whether the chosen provider enforces signed Content-Type and Content-Length must be checked during U-07. Commit-time validation (size, magic bytes, checksum) is kept as a second line of defence. Verified to work when storage does not enforce.

## Limitations

- Single-connection metadata database (PGlite): concurrent commits are serialized; real Postgres concurrency is untested.
- No HTTP API, authentication or rate limiting in front of the flow.
- No multipart or resumable uploads: PUTs are single-shot, and "resume" means retrying the whole object. Large-video resume strategies are untested (limits: U-08).
- No EXIF stripping or thumbnails.
- Phone background upload and resume: **B-43**, not verified.
