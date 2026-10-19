# ADR-0005: Media — private bucket, presigned direct upload, server commit, purge outbox

- **Status:** **Planning baseline** (owner direction, 2026-10-18): the working direction for Phase 2 planning. **Not Accepted**; implementation not verified (see Consequences for the evidence level).
- **Date:** 2026-10-18
- **Decision IDs:** §10 Media, §11, §12, P-12; open: U-07, U-08

## Context

§10: private S3-compatible storage with "short-lived authorized URLs, upload validation, retention and retry rules". §2: background uploads. §11: deletion must reach media, and stale devices must not re-upload deleted items.

## Decision

1. The client creates a `media` record (`pending_upload`) through the API for an entry it authors. The API returns a **short-lived presigned PUT** URL (minutes, single object, content-type and maximum size bound).
2. The client uploads directly to storage in the background; retries reuse the same media id.
3. The client calls **commit**. The server checks existence, size, type (magic bytes, not the extension) and checksum, strips location EXIF from photos, then marks the media `ready`. Validation failure → `rejected`, and the object is purged.
4. Downloads use short-lived presigned GET URLs issued per request after authorization. The bucket is never public.
5. Deleting an entry cascades to its media rows; a trigger enqueues each object key in `media_purge_queue`. A job deletes the objects and retries until it succeeds.
6. Commit or upload for a tombstoned entry answers `gone`; the client drops the queued upload.

## Consequences

- Object keys are random and opaque: never user names, file names or dates.
- Limits per type are U-08; storage and bandwidth cost depends on U-07. The storage region is undecided: UK residency is preferred, EU is the fallback (P-35, U-07 open).
- **Server-side evidence: F-07** (22 tests against local SeaweedFS, 2026-10-19) verifies retry, idempotent finalization, commit validation, outage recovery, purge and orphan cleanup **locally**. Findings proposed as **P-38**: storage reconciliation for late uploads, hard per-call deadlines, commit carries the entry id, and provider verification of signed headers. Phone background upload (B-43) and the chosen provider's behaviour (U-07) are **unverified**.
- An orphan sweeper removes `pending_upload` media older than a threshold (e.g. 24 h).
- Video and voice transcoding, if needed, is a background job and the first reason to add a queue (§10 Jobs).
